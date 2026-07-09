/* Back2Life.app — Pricing / subscription sheet
   window.b2lShowPricing(reason?) opens it. Stripe payment links get filled in below. */
(function () {
  // ── Stripe payment links (filled in once Stripe products are created) ──
  var LINKS = {
    starter_month: 'https://buy.stripe.com/5kQ00i2PF1k58nFeog1VK00',
    starter_year: 'https://buy.stripe.com/fZudR8cqf0g1dHZ93W1VK01',
    creator_month: 'https://buy.stripe.com/00wcN4cqf5Al9rJcg81VK02',
    creator_year: 'https://buy.stripe.com/eVqeVcfCr0g1eM3gwo1VK03',
    studio_month: 'https://buy.stripe.com/5kQ3cubmbd2N6fx6VO1VK04',
    studio_year: 'https://buy.stripe.com/28E4gy3TJaUF1Zh93W1VK05',
    topup_small: 'https://buy.stripe.com/fZufZg4XNaUFbzR93W1VK06',
    topup_mid: 'https://buy.stripe.com/4gMfZgeyn9QB9rJ7ZS1VK07',
    topup_big: 'https://buy.stripe.com/fZu00ieyn1k5bzReog1VK08'
  };

  var PLANS = [
    { key: 'starter', name: 'Starter', month: 9, year: 86.40, credits: '900', tag: null,
      perks: ['900 credits every month', 'All image + video models', 'Personal media library', 'All tutorials included'] },
    { key: 'creator', name: 'Creator', month: 29, year: 278.40, credits: '2,900', tag: 'MOST POPULAR',
      perks: ['2,900 credits every month', 'All image + video models', 'Personal media library', 'All tutorials included'] },
    { key: 'studio', name: 'Studio', month: 99, year: 950.40, credits: '9,900', tag: 'BEST VALUE',
      perks: ['9,900 credits every month', 'All image + video models', 'Personal media library', 'All tutorials included'] }
  ];
  var TOPUPS = [
    { key: 'topup_small', credits: '900', price: 9 },
    { key: 'topup_mid', credits: '2,900', price: 29 },
    { key: 'topup_big', credits: '9,900', price: 99 }
  ];

  var yearly = false;
  var built = false;

  function css() {
    var st = document.createElement('style');
    st.textContent =
      '#b2lPriceWrap{position:fixed;inset:0;z-index:100000;display:none}' +
      '#b2lPriceWrap.open{display:block}' +
      '#b2lPriceWrap .bp-dim{position:absolute;inset:0;background:rgba(0,0,0,0.6)}' +
      '#b2lPriceWrap .bp-sheet{position:absolute;left:0;right:0;bottom:0;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(12,12,12,0.98);backdrop-filter:blur(30px);border-top:1px solid rgba(255,255,255,0.13);border-radius:26px 26px 0 0;padding:22px 18px 40px;font-family:Inter,sans-serif}' +
      '#b2lPriceWrap .bp-handle{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:0 auto 18px}' +
      '#b2lPriceWrap h2{color:#f0f0f0;font-size:21px;font-weight:800;text-align:center;margin:0 0 6px}' +
      '#b2lPriceWrap .bp-sub{color:#aaaaaa;font-size:13.5px;text-align:center;margin:0 0 18px;line-height:1.5}' +
      '#b2lPriceWrap .bp-toggle{display:flex;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:4px;max-width:290px;margin:0 auto 18px}' +
      '#b2lPriceWrap .bp-toggle button{flex:1;padding:9px 6px;border:none;border-radius:999px;background:none;color:#aaaaaa;font-family:Inter,sans-serif;font-size:13px;font-weight:700;cursor:pointer}' +
      '#b2lPriceWrap .bp-toggle button.on{background:linear-gradient(135deg,#00cc66,#00ff88);color:#000}' +
      '#b2lPriceWrap .bp-card{position:relative;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:18px 16px;margin-bottom:12px}' +
      '#b2lPriceWrap .bp-card.hot{border-color:rgba(0,255,136,0.45);background:rgba(0,255,136,0.05)}' +
      '#b2lPriceWrap .bp-tag{position:absolute;top:-9px;left:16px;background:linear-gradient(135deg,#00cc66,#00ff88);color:#000;font-size:10px;font-weight:900;letter-spacing:1px;padding:3px 10px;border-radius:999px}' +
      '#b2lPriceWrap .bp-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}' +
      '#b2lPriceWrap .bp-name{color:#f0f0f0;font-size:17px;font-weight:800}' +
      '#b2lPriceWrap .bp-price{color:#00ff88;font-size:20px;font-weight:900}' +
      '#b2lPriceWrap .bp-price small{color:#aaaaaa;font-size:11.5px;font-weight:600}' +
      '#b2lPriceWrap .bp-save{color:#00ff88;font-size:11.5px;font-weight:700;margin:-4px 0 8px}' +
      '#b2lPriceWrap .bp-perks{margin:0 0 14px;padding:0;list-style:none}' +
      '#b2lPriceWrap .bp-perks li{color:#aaaaaa;font-size:12.5px;line-height:1.9}' +
      '#b2lPriceWrap .bp-perks li::before{content:"\\2713";color:#00ff88;font-weight:800;margin-right:8px}' +
      '#b2lPriceWrap .bp-btn{display:block;width:100%;text-align:center;background:linear-gradient(135deg,#00cc66,#00ff88);color:#000;font-size:14.5px;font-weight:800;padding:13px;border:none;border-radius:12px;text-decoration:none;cursor:pointer;font-family:Inter,sans-serif}' +
      '#b2lPriceWrap .bp-section{color:#555555;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:22px 0 12px}' +
      '#b2lPriceWrap .bp-topups{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
      '#b2lPriceWrap .bp-top{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer}' +
      '#b2lPriceWrap .bp-top .c{color:#f0f0f0;font-size:14.5px;font-weight:800}' +
      '#b2lPriceWrap .bp-top .l{color:#555555;font-size:10px;font-weight:700;letter-spacing:1px;margin:2px 0 6px}' +
      '#b2lPriceWrap .bp-top .p{color:#00ff88;font-size:14px;font-weight:900}' +
      '#b2lPriceWrap .bp-note{color:#555555;font-size:11.5px;text-align:center;line-height:1.6;margin-top:16px}' +
      '#b2lPriceWrap .bp-close{position:absolute;top:14px;right:16px;background:rgba(255,255,255,0.07);border:none;color:#aaaaaa;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer}';
    document.head.appendChild(st);
  }

  function fmt(n) { return '$' + (n % 1 === 0 ? n : n.toFixed(2)); }

  async function go(key) {
    var url = LINKS[key];
    if (!url) { alert('Checkout is being switched on \u2014 back very soon!'); return; }
    var uid = '';
    try {
      var res = await window.b2lSupabase.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (!session) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
      uid = session.user.id;
    } catch (e) {}
    window.location.href = url + (url.indexOf('?') > -1 ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(uid);
  }

  function render() {
    var plansEl = document.getElementById('bpPlans');
    plansEl.innerHTML = '';
    PLANS.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'bp-card' + (p.tag === 'MOST POPULAR' ? ' hot' : '');
      var priceHtml = yearly
        ? '<span class="bp-price">' + fmt(p.year) + '<small>/year</small></span>'
        : '<span class="bp-price">' + fmt(p.month) + '<small>/month</small></span>';
      card.innerHTML =
        (p.tag ? '<div class="bp-tag">' + p.tag + '</div>' : '') +
        '<div class="bp-row"><span class="bp-name">' + p.name + '</span>' + priceHtml + '</div>' +
        (yearly ? '<div class="bp-save">20% off \u2014 saves ' + fmt(p.month * 12 - p.year) + ' a year</div>' : '') +
        '<ul class="bp-perks">' + p.perks.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<button class="bp-btn">Get ' + p.name + '</button>';
      card.querySelector('.bp-btn').addEventListener('click', function () { go(p.key + (yearly ? '_year' : '_month')); });
      plansEl.appendChild(card);
    });
  }

  function build() {
    if (built) return;
    built = true;
    css();
    var wrap = document.createElement('div');
    wrap.id = 'b2lPriceWrap';
    wrap.innerHTML =
      '<div class="bp-dim"></div>' +
      '<div class="bp-sheet">' +
      '<button class="bp-close">\u2715</button>' +
      '<div class="bp-handle"></div>' +
      '<h2 id="bpTitle">Go Pro to Generate</h2>' +
      '<div class="bp-sub" id="bpSub">Unlock the AI image + video generator with monthly credits. Cancel anytime.</div>' +
      '<div class="bp-toggle"><button id="bpMonthly" class="on">Monthly</button><button id="bpYearly">Yearly \u2014 20% off</button></div>' +
      '<div id="bpPlans"></div>' +
      '<div class="bp-section">Top-Up Credits</div>' +
      '<div class="bp-topups" id="bpTopups"></div>' +
      '<div class="bp-note">1 credit \u2248 1 fast image \u00b7 videos from 130 credits \u00b7 monthly credits refresh on your billing date \u00b7 top-ups never expire</div>' +
      '</div>';
    document.body.appendChild(wrap);

    wrap.querySelector('.bp-dim').addEventListener('click', close);
    wrap.querySelector('.bp-close').addEventListener('click', close);
    document.getElementById('bpMonthly').addEventListener('click', function () {
      yearly = false; this.classList.add('on'); document.getElementById('bpYearly').classList.remove('on'); render();
    });
    document.getElementById('bpYearly').addEventListener('click', function () {
      yearly = true; this.classList.add('on'); document.getElementById('bpMonthly').classList.remove('on'); render();
    });

    var tEl = document.getElementById('bpTopups');
    TOPUPS.forEach(function (t) {
      var d = document.createElement('div');
      d.className = 'bp-top';
      d.innerHTML = '<div class="c">' + t.credits + '</div><div class="l">CREDITS</div><div class="p">' + fmt(t.price) + '</div>';
      d.addEventListener('click', function () { go(t.key); });
      tEl.appendChild(d);
    });
    render();
  }

  function close() { document.getElementById('b2lPriceWrap').classList.remove('open'); }

  /* ---------- Quick credits sheet (thumb-friendly overlay, no navigation) ---------- */
  var creditsBuilt = false;
  function buildCredits() {
    if (creditsBuilt) return;
    creditsBuilt = true;
    var st = document.createElement('style');
    st.textContent =
      '#b2lCredWrap{position:fixed;inset:0;z-index:100001;display:none}' +
      '#b2lCredWrap.open{display:block}' +
      '#b2lCredWrap .bc-dim{position:absolute;inset:0;background:rgba(0,0,0,0.55)}' +
      '#b2lCredWrap .bc-sheet{position:absolute;left:0;right:0;bottom:0;background:rgba(12,12,12,0.98);backdrop-filter:blur(30px);border-top:1px solid rgba(255,255,255,0.13);border-radius:26px 26px 0 0;padding:14px 20px calc(28px + env(safe-area-inset-bottom));font-family:Inter,sans-serif;transform:translateY(100%);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1)}' +
      '#b2lCredWrap.open .bc-sheet{transform:translateY(0)}' +
      '#b2lCredWrap .bc-handle{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:0 auto 16px}' +
      '#b2lCredWrap .bc-big{text-align:center;margin-bottom:4px}' +
      '#b2lCredWrap .bc-big .n{font-size:42px;font-weight:900;color:#00ff88;line-height:1}' +
      '#b2lCredWrap .bc-big .l{font-size:10.5px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#555555;margin-top:6px}' +
      '#b2lCredWrap .bc-rows{margin:18px 0 6px}' +
      '#b2lCredWrap .bc-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13.5px}' +
      '#b2lCredWrap .bc-row:last-child{border-bottom:none}' +
      '#b2lCredWrap .bc-row .k{color:#aaaaaa}' +
      '#b2lCredWrap .bc-row .v{color:#f0f0f0;font-weight:700}' +
      '#b2lCredWrap .bc-row .v.green{color:#00ff88}' +
      '#b2lCredWrap .bc-btn{display:block;width:100%;text-align:center;border:none;border-radius:12px;padding:14px;font-family:Inter,sans-serif;font-size:14.5px;font-weight:800;cursor:pointer;margin-top:10px;text-decoration:none}' +
      '#b2lCredWrap .bc-primary{background:linear-gradient(135deg,#00cc66,#00ff88);color:#000}' +
      '#b2lCredWrap .bc-ghost{background:rgba(255,255,255,0.05);color:#f0f0f0;border:1px solid rgba(255,255,255,0.13)}';
    document.head.appendChild(st);

    var wrap = document.createElement('div');
    wrap.id = 'b2lCredWrap';
    wrap.innerHTML =
      '<div class="bc-dim"></div>' +
      '<div class="bc-sheet">' +
      '<div class="bc-handle"></div>' +
      '<div class="bc-big"><div class="n" id="bcCredits">—</div><div class="l">Credits Remaining</div></div>' +
      '<div class="bc-rows">' +
      '<div class="bc-row"><span class="k">Plan</span><span class="v" id="bcPlan">—</span></div>' +
      '<div class="bc-row"><span class="k">Status</span><span class="v" id="bcStatus">—</span></div>' +
      '<div class="bc-row" id="bcRenewRow" style="display:none"><span class="k">Credits refresh</span><span class="v" id="bcRenews">—</span></div>' +
      '</div>' +
      '<button class="bc-btn bc-primary" id="bcPlansBtn">Plans &amp; Top-Up Credits</button>' +
      '<a class="bc-btn bc-ghost" href="/account">Manage Account</a>' +
      '</div>';
    document.body.appendChild(wrap);

    function closeC() { wrap.classList.remove('open'); }
    wrap.querySelector('.bc-dim').addEventListener('click', closeC);
    document.getElementById('bcPlansBtn').addEventListener('click', function () {
      closeC();
      window.b2lShowPricing();
    });

    /* Swipe down to close */
    var sheet = wrap.querySelector('.bc-sheet');
    var startY = 0, dragging = false;
    sheet.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; dragging = true; }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (!dragging) return; dragging = false;
      var dy = e.changedTouches[0].clientY - startY;
      sheet.style.transform = '';
      if (dy > 70) closeC();
    }, { passive: true });
  }

  window.b2lShowCredits = async function () {
    buildCredits();
    var wrap = document.getElementById('b2lCredWrap');
    wrap.classList.add('open');
    try {
      var res = await window.b2lSupabase.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (!session) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
      var q = await window.b2lSupabase.from('profiles')
        .select('credits, plan, subscription_status, billing_period, sub_renews_at, last_grant_at')
        .eq('id', session.user.id).single();
      var p = q.data || {};
      var active = p.subscription_status === 'active';
      document.getElementById('bcCredits').textContent = (p.credits || 0).toLocaleString();
      document.getElementById('bcPlan').textContent = p.plan && p.plan !== 'free'
        ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) + (p.billing_period === 'year' ? ' (Yearly)' : '')
        : 'Free';
      var stEl = document.getElementById('bcStatus');
      stEl.textContent = active ? 'Active' : 'Free account';
      stEl.className = active ? 'v green' : 'v';
      if (active && p.sub_renews_at) {
        document.getElementById('bcRenewRow').style.display = 'flex';
        var refDate = p.billing_period === 'year' && p.last_grant_at
          ? new Date(new Date(p.last_grant_at).getTime() + 30 * 864e5)
          : new Date(p.sub_renews_at);
        document.getElementById('bcRenews').textContent = refDate.toLocaleDateString();
      }
    } catch (e) {}
  };

  window.b2lShowPricing = function (reason) {
    build();
    var t = document.getElementById('bpTitle');
    var s = document.getElementById('bpSub');
    if (reason === 'insufficient_credits') {
      t.textContent = 'Out of Credits';
      s.textContent = 'Grab a top-up pack below, or move up a plan for more monthly credits.';
    } else if (reason === 'pro_required') {
      t.textContent = 'Pro Account Only';
      s.textContent = 'Generating images and videos needs a Pro plan. Pick one below \u2014 cancel anytime.';
    } else {
      t.textContent = 'Plans & Credits';
      s.textContent = 'Unlock the AI image + video generator with monthly credits. Cancel anytime.';
    }
    document.getElementById('b2lPriceWrap').classList.add('open');
  };
})();
