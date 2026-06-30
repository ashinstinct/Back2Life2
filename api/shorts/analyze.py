from http.server import BaseHTTPRequestHandler
import json
import os
import re
import subprocess
import tempfile
import uuid
import requests

MAX_DURATION_SECONDS = 200  # ~3.3 min hard cap to stay inside function time limits

YOUTUBE_RE = re.compile(r'^https?://(www\.)?(youtube\.com|youtu\.be)/')

HIGHLIGHT_KEYWORDS = [
    "secret", "amazing", "crazy", "insane", "shocking", "never", "best", "worst",
    "huge", "important", "mistake", "wrong", "right", "free", "money", "fast",
    "easy", "hack", "trick", "wait", "listen", "honestly", "actually", "literally",
    "here's why", "the reason", "nobody", "everyone", "stop", "biggest"
]


def run(cmd, timeout=45):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def get_video_meta(url):
    res = run(["yt-dlp", "-j", "--no-playlist", url], timeout=30)
    if res.returncode != 0:
        raise RuntimeError("Could not read that video. Check the URL is a public YouTube link.")
    info = json.loads(res.stdout)
    return info.get("title", "Untitled"), float(info.get("duration") or 0)


def download_audio(url, out_path):
    res = run([
        "yt-dlp", "-x", "--audio-format", "mp3", "--audio-quality", "5",
        "--no-playlist", "-o", out_path, url
    ], timeout=55)
    if res.returncode != 0:
        raise RuntimeError("Failed to download audio from that video.")


def transcribe(audio_path):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Server is missing OPENAI_API_KEY — add it in your Vercel project's Environment Variables.")

    with open(audio_path, "rb") as f:
        resp = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
            data={"model": "whisper-1", "response_format": "verbose_json"},
            timeout=55
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Transcription failed: {resp.text[:200]}")

    data = resp.json()
    segments = []
    for seg in data.get("segments", []):
        segments.append({
            "start": seg.get("start", 0),
            "end": seg.get("end", 0),
            "text": (seg.get("text") or "").strip()
        })
    return segments


def score_window(segs):
    text = " ".join(s["text"] for s in segs).lower()
    score = text.count("!") * 2 + text.count("?") * 2
    for kw in HIGHLIGHT_KEYWORDS:
        if kw in text:
            score += 3
    word_count = len(text.split())
    score += min(word_count / 8.0, 10)
    return score


def find_highlights(segments, duration, num_clips, clip_duration):
    if not segments:
        return []

    candidates = []
    step = max(clip_duration * 0.5, 10)
    t = 0.0
    while t + clip_duration <= duration + 1:
        window_end = t + clip_duration
        window_segs = [s for s in segments if s["start"] < window_end and s["end"] > t]
        if window_segs:
            score = score_window(window_segs)
            text = " ".join(s["text"] for s in window_segs).strip()
            candidates.append({
                "start": round(t, 2),
                "end": round(min(window_end, duration), 2),
                "score": score,
                "text": text
            })
        t += step

    if not candidates:
        return []

    candidates.sort(key=lambda c: c["score"], reverse=True)

    chosen = []
    for c in candidates:
        overlap = any(not (c["end"] <= ch["start"] or c["start"] >= ch["end"]) for ch in chosen)
        if not overlap:
            chosen.append(c)
        if len(chosen) >= num_clips:
            break

    chosen.sort(key=lambda c: c["start"])
    return chosen


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            url = (body.get("url") or "").strip()
            num_clips = int(body.get("numClips") or 3)
            clip_duration = int(body.get("clipDuration") or 45)

            if not url or not YOUTUBE_RE.match(url):
                self._send(400, {"error": "Please paste a valid YouTube URL."})
                return

            title, duration = get_video_meta(url)

            if duration <= 0:
                self._send(400, {"error": "Could not determine video length."})
                return
            if duration > MAX_DURATION_SECONDS:
                self._send(400, {
                    "error": f"This video is {int(duration)}s long. To stay within the free function time limit, please use a video under {MAX_DURATION_SECONDS}s (~{MAX_DURATION_SECONDS//60} min)."
                })
                return

            tmp_dir = tempfile.mkdtemp()
            audio_base = os.path.join(tmp_dir, f"audio-{uuid.uuid4().hex}.%(ext)s")
            download_audio(url, audio_base)

            audio_path = audio_base.replace("%(ext)s", "mp3")
            if not os.path.exists(audio_path):
                matches = [f for f in os.listdir(tmp_dir) if f.endswith(".mp3")]
                if not matches:
                    self._send(500, {"error": "Audio download produced no file."})
                    return
                audio_path = os.path.join(tmp_dir, matches[0])

            segments = transcribe(audio_path)
            clips = find_highlights(segments, duration, num_clips, clip_duration)

            self._send(200, {
                "title": title,
                "duration": duration,
                "segments": segments,
                "suggestedClips": clips
            })

        except subprocess.TimeoutExpired:
            self._send(504, {"error": "That video took too long to process. Try a shorter one."})
        except RuntimeError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:
            self._send(500, {"error": f"Unexpected error: {str(e)}"})

    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
