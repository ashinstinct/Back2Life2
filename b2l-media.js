/* Back2Life.app — shared media enhancer
   Makes every content image clickable → fullscreen lightbox with a Download button.
   Included on all tutorial pages. Safe to include anywhere. */
(function () {
  function enhance() {
    var imgs = document.querySelectorAll('.container img');
    imgs.forEach(function (img) {
      if (img.closest('a')) return;            // don't hijack linked images
      if (img.dataset.b2lZoom) return;         // don't double-bind
      img.dataset.b2lZoom = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        openLightbox(img.currentSrc || img.src, img.alt || 'Back2Life image');
      });
    });
  }

  function openLightbox(src, alt) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';

    var im = document.createElement('img');
    im.src = src;
    im.alt = alt;
    im.style.cssText = 'max-width:96vw;max-height:80vh;object-fit:contain;border-radius:10px;box-shadow:0 12px 50px rgba(0,0,0,0.7)';

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;justify-content:center';

    var dl = document.createElement('a');
    dl.textContent = '\u2B07 Download';
    dl.href = src;
    dl.setAttribute('download', (src.split('/').pop() || 'image').split('?')[0]);
    dl.style.cssText = 'background:linear-gradient(135deg,#00cc66,#00ff88);color:#000;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:Inter,sans-serif;box-shadow:0 4px 20px rgba(0,255,136,0.25)';

    var cl = document.createElement('button');
    cl.textContent = '\u2715 Close';
    cl.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;cursor:pointer;font-family:Inter,sans-serif';

    function close() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    cl.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    im.addEventListener('click', function (e) { e.stopPropagation(); });
    dl.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', onKey);

    bar.appendChild(dl);
    bar.appendChild(cl);
    ov.appendChild(im);
    ov.appendChild(bar);
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
