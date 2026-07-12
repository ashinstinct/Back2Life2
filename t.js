/* Back2Life.app — lightweight visit tracker
   Logs one row per pageview to Supabase (page_visits).
   No cookies, no personal data — just path + traffic source. */
(function () {
  try {
    if (navigator.webdriver) return; // skip bots/automation
    var path = window.location.pathname;
    if (path === '/stats' || path === '/stats.html') return; // don't count admin page

    var ref = document.referrer || '';
    var params = new URLSearchParams(window.location.search);
    var utmSource = params.get('utm_source') || null;
    var utmCampaign = params.get('utm_campaign') || null;

    function classify() {
      var s = (utmSource || '').toLowerCase();
      var r = ref.toLowerCase();
      var host = '';
      try { host = ref ? new URL(ref).hostname : ''; } catch (e) {}
      if (host.indexOf('back2lifeapp.vercel.app') !== -1 || host === 'back2life.app') return 'internal'; // navigation between site pages
      if (s.indexOf('tiktok') !== -1 || r.indexOf('tiktok') !== -1) return 'tiktok';
      if (s.indexOf('instagram') !== -1 || s === 'ig' || r.indexOf('instagram') !== -1 || r.indexOf('l.instagram') !== -1) return 'instagram';
      if (s.indexOf('youtube') !== -1 || s === 'yt' || r.indexOf('youtube') !== -1 || r.indexOf('youtu.be') !== -1) return 'youtube';
      if (s.indexOf('twitter') !== -1 || s === 'x' || r.indexOf('//t.co') !== -1 || r.indexOf('twitter.com') !== -1 || r.indexOf('//x.com') !== -1) return 'x';
      if (r.indexOf('facebook') !== -1 || r.indexOf('fb.com') !== -1) return 'facebook';
      if (r.indexOf('bit.ly') !== -1) return 'bitly';
      if (r.indexOf('google.') !== -1 || r.indexOf('bing.') !== -1 || r.indexOf('duckduckgo') !== -1) return 'search';
      if (utmSource) return s;
      if (!ref) return 'direct';
      return 'other';
    }

    var source = classify();

    var body = JSON.stringify({
      path: path,
      source: source,
      referrer: ref ? ref.slice(0, 300) : null,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      is_mobile: /Mobi|Android/i.test(navigator.userAgent)
    });

    var url = 'https://sfpokfgfycsqvhtpamgm.supabase.co/rest/v1/page_visits';
    var key = 'sb_publishable_T0QKdJAb6katQhGtA8gWZA_xxnA4r_A';

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'return=minimal'
      },
      body: body,
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();
