from http.server import BaseHTTPRequestHandler
import json
import os
import re
import subprocess
import tempfile
import uuid
import yt_dlp

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = "ffmpeg"

YOUTUBE_RE = re.compile(r'^https?://(www\.)?(youtube\.com|youtu\.be)/')
MAX_CLIP_SECONDS = 90


def run(cmd, timeout=50):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def fmt_srt_time(t):
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(segments, clip_start, clip_end, srt_path):
    lines = []
    idx = 1
    for seg in segments:
        if seg["end"] <= clip_start or seg["start"] >= clip_end:
            continue
        s = max(seg["start"], clip_start) - clip_start
        e = min(seg["end"], clip_end) - clip_start
        text = (seg.get("text") or "").strip()
        if not text or e <= s:
            continue
        lines.append(str(idx))
        lines.append(f"{fmt_srt_time(s)} --> {fmt_srt_time(e)}")
        lines.append(text)
        lines.append("")
        idx += 1

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return idx > 1


def download_section(url, start, end, out_dir, uid):
    out_tmpl = os.path.join(out_dir, f"src-{uid}.%(ext)s")

    def ranges_fn(info_dict, ydl):
        return [{"start_time": start, "end_time": end}]

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": out_tmpl,
        "merge_output_format": "mp4",
        "download_ranges": ranges_fn,
        "force_keyframes_at_cuts": True,
    }
    if FFMPEG_BIN:
        ydl_opts["ffmpeg_location"] = FFMPEG_BIN

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        raise RuntimeError("Could not download that section of the video.") from e

    expected = os.path.join(out_dir, f"src-{uid}.mp4")
    if os.path.exists(expected):
        return expected
    matches = [f for f in os.listdir(out_dir) if f.startswith(f"src-{uid}")]
    if matches:
        return os.path.join(out_dir, matches[0])
    raise RuntimeError("Could not download that section of the video.")


def render_vertical(src_path, out_path, srt_path, has_captions):
    vf_parts = [
        "scale=-2:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920"
    ]
    if has_captions and os.path.exists(srt_path):
        escaped = srt_path.replace("\\", "\\\\").replace(":", "\\:")
        style = "FontName=Arial,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Bold=1,Alignment=2,MarginV=140"
        vf_parts.append(f"subtitles='{escaped}':force_style='{style}'")

    vf = ",".join(vf_parts)

    cmd = [
        FFMPEG_BIN, "-y", "-i", src_path,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        out_path
    ]
    res = run(cmd, timeout=55)
    if res.returncode != 0:
        # fallback: try again without captions if subtitle burn failed
        if has_captions:
            cmd_fallback = [
                FFMPEG_BIN, "-y", "-i", src_path,
                "-vf", "scale=-2:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                out_path
            ]
            res2 = run(cmd_fallback, timeout=55)
            if res2.returncode != 0:
                raise RuntimeError(f"ffmpeg failed: {res2.stderr[-300:]}")
        else:
            raise RuntimeError(f"ffmpeg failed: {res.stderr[-300:]}")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")

            url = (body.get("url") or "").strip()
            start = float(body.get("start") or 0)
            end = float(body.get("end") or 0)
            segments = body.get("segments") or []

            if not url or not YOUTUBE_RE.match(url):
                self._send_json(400, {"error": "Invalid YouTube URL."})
                return
            if end <= start or (end - start) > MAX_CLIP_SECONDS:
                self._send_json(400, {"error": "Invalid clip range."})
                return

            tmp_dir = tempfile.mkdtemp()
            uid = uuid.uuid4().hex
            srt_path = os.path.join(tmp_dir, f"cap-{uid}.srt")
            out_path = os.path.join(tmp_dir, f"out-{uid}.mp4")

            src_path = download_section(url, start, end, tmp_dir, uid)

            # yt-dlp's --download-sections gives us roughly [start,end] starting near 0
            has_captions = build_srt(segments, start, end, srt_path)

            render_vertical(src_path, out_path, srt_path, has_captions)

            with open(out_path, "rb") as f:
                data = f.read()

            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Disposition", 'attachment; filename="short.mp4"')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        except subprocess.TimeoutExpired:
            self._send_json(504, {"error": "Rendering took too long. Try a shorter clip."})
        except RuntimeError as e:
            self._send_json(400, {"error": str(e)})
        except Exception as e:
            self._send_json(500, {"error": f"Unexpected error: {str(e)}"})

    def _send_json(self, status, payload):
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
