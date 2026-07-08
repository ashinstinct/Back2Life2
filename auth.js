/* Back2Life.app — Auth (Supabase)
   Loaded on tutorial pages + login page.
   Requires supabase-js v2 CDN script loaded first. */
(function () {
  var SUPABASE_URL = 'https://sfpokfgfycsqvhtpamgm.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_T0QKdJAb6katQhGtA8gWZA_xxnA4r_A';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[B2L Auth] supabase-js not loaded');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.b2lSupabase = sb;

  window.b2lSignOut = function () {
    sb.auth.signOut().then(function () { window.location.href = '/'; });
  };

  /* ---------- Tutorial gate ---------- */
  var path = window.location.pathname;
  var isTutorial = /^\/tutorial-\d+/.test(path);
  if (!isTutorial) return;

  function showGate() {
    if (document.getElementById('b2lGate')) return;

    /* Blur page content behind the gate */
    var st = document.createElement('style');
    st.textContent =
      'body>*:not(#b2lGate){filter:blur(14px);pointer-events:none;user-select:none}' +
      'body{overflow:hidden}' +
      '#b2lGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,8,8,0.55)}' +
      '#b2lGate .b2l-card{background:rgba(12,12,12,0.97);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.13);border-radius:26px;padding:36px 28px;max-width:400px;width:100%;text-align:center;font-family:Inter,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.6)}' +
      '#b2lGate img{width:64px;height:64px;border-radius:16px;margin-bottom:18px}' +
      '#b2lGate h2{color:#f0f0f0;font-size:22px;font-weight:800;margin:0 0 10px}' +
      '#b2lGate p{color:#aaaaaa;font-size:14.5px;line-height:1.6;margin:0 0 24px}' +
      '#b2lGate .b2l-btn{display:block;width:100%;background:linear-gradient(135deg,#00cc66,#00ff88);color:#000;font-weight:700;font-size:15px;padding:15px;border-radius:12px;text-decoration:none;box-shadow:0 4px 20px rgba(0,255,136,0.2)}' +
      '#b2lGate .b2l-sub{margin-top:14px;font-size:12.5px;color:#555555}';
    document.head.appendChild(st);

    var gate = document.createElement('div');
    gate.id = 'b2lGate';
    gate.innerHTML =
      '<div class="b2l-card">' +
      '<img src="/apple-touch-icon.png" alt="Back2Life">' +
      '<h2>Free Tutorial — Sign In to Unlock</h2>' +
      '<p>Create a free account to access all AI video tutorials, prompts and storyboards on Back2Life.app.</p>' +
      '<a class="b2l-btn" href="/login?next=' + encodeURIComponent(path) + '">Sign In / Create Free Account</a>' +
      '<div class="b2l-sub">Takes 10 seconds &middot; 100% free</div>' +
      '</div>';
    document.body.appendChild(gate);
  }

  function removeGate() {
    var g = document.getElementById('b2lGate');
    if (g) g.remove();
  }

  sb.auth.getSession().then(function (res) {
    var session = res && res.data ? res.data.session : null;
    if (!session) showGate();
  });

  sb.auth.onAuthStateChange(function (_event, session) {
    if (session) removeGate();
  });
})();
