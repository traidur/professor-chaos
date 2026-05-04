/**
 * chaos.js — Professor Chaos Platform
 * Hosted centrally. Update here, all generated sites get it.
 *
 * Interface:
 *   startChaos({ appName, itemNoun })  — called by generated site when chaos is enabled
 *   stopChaos()                        — called when chaos is disabled
 *
 * To enable/disable individual elements: edit CHAOS_CONFIG below and push.
 */

// URL of the professor-chaos GitHub Pages site (no trailing slash)
const PROFESSOR_CHAOS_ORIGIN = 'https://traidur.github.io/professor-chaos';

// Platform Supabase — for reading chaos config
const _PC_URL = 'https://gsitwuzhtyzdgoihmruz.supabase.co';
const _PC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXR3dXpodHl6ZGdvaWhtcnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjAyMDAsImV4cCI6MjA5MzIzNjIwMH0.wfLeKzqQGbpivMFswqb0W88KIPG0p7CGuCRfBwfRWZ4';

async function _loadChaosConfig() {
  try {
    const resp = await fetch(
      `${_PC_URL}/rest/v1/platform_settings?key=eq.chaos_config&select=value`,
      { headers: { 'apikey': _PC_KEY, 'Authorization': `Bearer ${_PC_KEY}` } }
    );
    const data = await resp.json();
    if (data && data[0] && data[0].value) {
      // DB config takes precedence; CHAOS_CONFIG fills in any missing keys
      return { ...CHAOS_CONFIG, ...data[0].value };
    }
  } catch(e) { /* fall through to defaults */ }
  return CHAOS_CONFIG;
}

const CHAOS_CONFIG = {
  premStrip:        true,   // "Upgrade to Pro" banner strip
  bannerAd:         true,   // rotating fake SaaS ad above nav
  cookieBanner:     true,   // cookie consent with runaway reject button
  millionthUser:    true,   // "You're our 1,000,000th user!" popup
  fakeActivity:     true,   // "Someone just voted!" toasts
  survey:           true,   // fake survey (says 3 questions, is infinite)
  ballotAds:        true,   // ads + SPONSORED badge injected into ballot
  geoChaos:         true,   // full geocities mode (gutters, marquee, etc.)
  cat:              true,   // cursor-stalking cat
  catGameOver:      true,   // GAME OVER screen when cat catches you
  face:             true,   // photo that trails the cat
  exitIntent:       true,   // popup when mouse leaves the browser
  titleFlicker:     true,   // tab title fake-urgent alerts when hidden
  rageClick:        true,   // snark message on rapid clicking
  fakeNotif:        true,   // fake browser notification prompt
  progressBar:      true,   // fake "loading" progress bar that stalls
  faviconBadge:     true,   // red badge on favicon
  truck:            true,   // semi truck drives across viewport
  midi:             true,   // MIDI music engine
  clickBlip:        true,   // 8-bit sound on every click
  fontChaos:        true,   // font changes on every click
  infiniteScroll:   true,   // clones page content at bottom of scroll
  subwaySurfers:    true,   // floating Subway Surfers iframe
  reportButton:     true,   // "Report a Problem" button that runs away
};

// ── STATE ─────────────────────────────────────────────────────────────────────
let _started = false;
let _cfg = {};
let _ac = null, _mPlaying = false, _mTimeout = null, _mMaster = null;
let _currentSongIdx = 0;
let _cdtInt = null;
let _gutterClockInt = null;

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────
window.startChaos = async function(cfg = {}) {
  _cfg = cfg;
  if (_started) return;
  _started = true;

  const C = await _loadChaosConfig();

  if (C.bannerAd)       _genBannerAd();
  if (C.premStrip)      _premStrip();
  if (C.geoChaos)       _geoChaos();
  if (C.cat)            _spawnCat(C);
  if (C.face)           _spawnFace();
  if (C.truck)          _scheduleTruck();
  if (C.fontChaos)      _startFontChaos();
  if (C.infiniteScroll) _startInfScroll();
  if (C.subwaySurfers)  _startSubwaySurfers();
  if (C.reportButton)   _startReportBtn();
  if (C.exitIntent)     _exitIntent();
  if (C.titleFlicker)   _startTitleFlicker();
  if (C.rageClick)      _startRageClick();
  if (C.progressBar)    _startProgressBar();
  if (C.faviconBadge)   _fakeFaviconBadge();
  if (C.clickBlip)      document.addEventListener('mousedown', _clickBlip);

  setTimeout(() => { if (C.cookieBanner)   _cookieBanner(); }, 1200);
  setTimeout(() => { if (C.fakeNotif)      _fakeNotifPrompt(); }, 10000);
  setTimeout(() => { if (C.millionthUser)  _millVoter(); }, 6000);
  setTimeout(() => { if (C.survey)         _survey(); }, 55000);

  if (C.fakeActivity) _fakeActivityLoop();
};

window.stopChaos = function() {
  // Soft stop — remove injected elements where practical
  ['_pst','_hba','_geos','_mqw','_vcw','_gutter-l','_gutter-r',
   '_subway-surfers','_report-btn','_pb','_atw'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  document.querySelectorAll('._gifoid').forEach(el => el.remove());
  _midiStop();
  if (_gutterClockInt) clearInterval(_gutterClockInt);
  document.body.style.marginLeft = '';
  document.body.style.marginRight = '';
  _started = false;
};

// ── FAKE ADS ──────────────────────────────────────────────────────────────────
const _adjs  = ['Quantum','Synergistic','Disruptive','AI-Powered','Dynamic','Next-Gen','Agile','Frictionless'];
const _nouns = ['Solutions','Platform','Intelligence','Nexus','Engine','Ventures','Framework','Collective'];
const _taglines = [
  'Leveraging AI to disrupt the global voting industry.',
  'Empowering teams to make data-driven decisions at scale.',
  'The only end-to-end poll orchestration platform built for the enterprise.',
  'Transforming workplace democracy through vertical SaaS innovation.',
  'Democratizing access to opinions for forward-thinking organizations.',
];
const _ctas   = ['GET A DEMO →','START FREE TRIAL','CLAIM YOUR ROI','TALK TO SALES','SEE PRICING'];
const _emojis = ['🗳️','🚀','💡','🌐','📊','🤖','💼','🧠','⚡','🔮'];
const _seen   = [['TechCrunch','Forbes','Vote Weekly'],['CNBC','Wired','Poll & Fortune'],['Bloomberg','Fast Company','The Decision Times']];
const _pick   = a => a[Math.floor(Math.random() * a.length)];

const _adData = [
  { h: 'HUNGRY FOR RESULTS? Analysts HATE This', s: 'One weird poll trick — try before it\'s banned', cta: 'CLAIM FREE VOTES' },
  { h: 'VoteGuard™ PRO', s: 'Protect your ballot from bad outcomes. Only $4.99/mo', cta: 'GET PROTECTED' },
  { h: 'Is someone stealing your votes?', s: 'PollSpy™ — results in seconds. You deserve to know.', cta: 'FIND OUT NOW' },
  { h: "YOU'VE BEEN PRE-APPROVED!", s: 'For the Poll-o-matic™ Platinum Card. 0% APR on all decisions.', cta: 'ACCEPT OFFER' },
  { h: 'FLASH SALE — 40% OFF', s: 'Limited-time offer on premium opinions. Quantities limited.', cta: 'SHOP NOW' },
  { h: 'One weird trick to always win the vote', s: 'Platform owners FURIOUS. Click before it gets taken down.', cta: 'SEE THE TRICK' },
];

function _genBannerAd() {
  let hba = document.getElementById('_hba');
  if (!hba) {
    hba = document.createElement('div');
    hba.id = '_hba';
    document.body.prepend(hba);
  }
  const company = `${_pick(_adjs)} ${_pick(_nouns)}™`;
  const tagline = _pick(_taglines);
  const em = _pick(_emojis);
  const pubs = _pick(_seen);
  const cta = _pick(_ctas);
  const trackNum = Math.floor(Math.random() * 999999);
  hba.innerHTML = `
    <div style="text-align:center;font-size:0.52rem;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:2px 0">Advertisement</div>
    <div style="background:linear-gradient(90deg,#0f172a,#1e3a5f,#0f172a);color:#fff;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:1.8rem">${em}</div>
        <div>
          <div style="font-weight:700;font-size:0.95rem">${escHtml(company)}</div>
          <div style="font-size:0.72rem;color:#94a3b8">${escHtml(tagline)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="font-size:0.68rem;color:#94a3b8;text-align:right">As seen on<br><strong style="color:#f59e0b">${pubs.join(' · ')}</strong></div>
        <button onclick="alert('Thank you for your interest in ${escHtml(company)}.\\n\\nA sales rep will reach out within 3–5 business decades.\\n\\nRef #${trackNum}')" style="background:#f59e0b;color:#000;border:none;padding:7px 16px;border-radius:4px;font-weight:700;font-size:0.78rem;cursor:pointer;white-space:nowrap">${escHtml(cta)}</button>
      </div>
    </div>`;
}

// ── PREMIUM STRIP ─────────────────────────────────────────────────────────────
function _premStrip() {
  if (document.getElementById('_pst')) return;
  const d = document.createElement('div');
  d.id = '_pst';
  d.style.cssText = 'background:linear-gradient(90deg,#1e3a5f,#2563eb);color:#fff;text-align:center;padding:7px 16px;font-size:0.8rem;display:flex;align-items:center;justify-content:center;gap:12px';
  d.innerHTML = `⭐ <strong>Upgrade to Pro™</strong> — Unlimited votes, priority support &amp; a free tote bag &nbsp;<button onclick="alert('Coming soon!™\\n\\nEstimated launch: Q3 2027')" style="background:#f59e0b;color:#000;border:none;padding:3px 12px;border-radius:4px;font-size:0.73rem;font-weight:700;cursor:pointer">GET PRO — $4.99/mo</button><span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:0.4;margin-left:6px">✕</span>`;
  document.body.prepend(d);
}

// ── COOKIE BANNER ─────────────────────────────────────────────────────────────
function _cookieBanner() {
  if (sessionStorage.getItem('_ckd') || document.getElementById('_ckb')) return;
  const d = document.createElement('div');
  d.id = '_ckb';
  d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#ddd;padding:14px 20px;z-index:9999;display:flex;gap:12px;align-items:center;font-size:0.77rem;box-shadow:0 -4px 20px rgba(0,0,0,0.5)';
  d.innerHTML = `<div style="flex:1">
    <p style="margin:0 0 6px">🍪 We use cookies to enhance your experience, track your preferences, and comply with the Voting Convention (Chaos Edition). <a href="#" onclick="return false" style="color:#f59e0b">Privacy Policy</a></p>
    <div style="font-size:0.66rem;color:#aaa;display:flex;flex-wrap:wrap;gap:10px">
      <label><input type="checkbox" checked disabled> Strictly necessary</label>
      <label><input type="checkbox" checked> Performance &amp; analytics</label>
      <label><input type="checkbox" checked> Share data with Big Algorithm™</label>
      <label><input type="checkbox" checked> Allow us to monitor your thermostat</label>
      <label><input type="checkbox" checked> Sell your opinion profile to third parties</label>
    </div>
  </div>
  <button onclick="sessionStorage.setItem('_ckd','1');this.closest('#_ckb').remove();_midiPlay()" style="background:#22c55e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:700;white-space:nowrap">Accept All 🍪</button>
  <button onmouseover="_ckRun(this)" style="background:transparent;color:#999;border:1px solid #555;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.7rem;white-space:nowrap;transition:transform 0.2s ease;display:inline-block">Reject All</button>`;
  document.body.appendChild(d);
}

function _ckRun(btn) {
  const x = (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 140);
  const y = (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 80);
  btn.style.transform = `translate(${x}px,${y}px)`;
}

// ── MILLION-TH USER ───────────────────────────────────────────────────────────
function _millVoter() {
  if (sessionStorage.getItem('_mvd') || document.getElementById('_mvo')) return;
  sessionStorage.setItem('_mvd', '1');
  const trackNum = Math.floor(Math.random() * 9999999);
  const d = document.createElement('div');
  d.id = '_mvo';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center';
  d.innerHTML = `<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:90%;text-align:center">
    <div style="font-size:3rem">🎉</div>
    <h2 style="color:#f59e0b;font-size:1.8rem;margin:0 0 8px">YOU'RE OUR<br>1,000,000th VOTER!</h2>
    <p style="color:#555;margin:0 0 20px;font-size:0.88rem">Congratulations! You've been selected to receive a <strong>FREE PRIZE</strong>. Claim within 24 hours or it will be forfeited.</p>
    <button onclick="alert('Congratulations! Your prize is being processed.\\n\\nEstimated delivery: 6–8 business weeks.\\nTracking #: PC${trackNum}')" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer">🎁 CLAIM MY PRIZE</button>
    <button onclick="document.getElementById('_mvo').remove()" style="display:block;margin-top:10px;color:#ccc;font-size:0.66rem;cursor:pointer;background:none;border:none">No thanks, I hate free things</button>
  </div>`;
  document.body.appendChild(d);
}

// ── FAKE ACTIVITY ─────────────────────────────────────────────────────────────
const _fakeNames = ['Dave from Accounting','Karen from HR','Todd in Sales','The Intern','Your Boss (👀)','Chad from Marketing','mysterious_user_4729','Anonymous (definitely Brad)','Jenn (not that Jenn)','Gerald'];

function _fakeActivityLoop() {
  setTimeout(() => { _fakeActivity(); _fakeActivityLoop(); }, 18000 + Math.random() * 22000);
}

function _fakeActivity() {
  let wrap = document.getElementById('_atw');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = '_atw';
    wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9998;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:280px';
    document.body.appendChild(wrap);
  }
  const name = _fakeNames[Math.floor(Math.random() * _fakeNames.length)];
  const msg  = Math.random() > 0.4 ? 'just voted! 🗳️' : 'is eyeing the ballot 👀';
  const el   = document.createElement('div');
  el.style.cssText = 'background:#fff;border-radius:8px;padding:10px 14px;font-size:0.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);border-left:4px solid #22c55e;animation:_sIn 0.3s ease';
  el.innerHTML = `<b>${escHtml(name)}</b> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.animation = '_sOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 4500);
}

// ── SURVEY ────────────────────────────────────────────────────────────────────
const _svQs = [
  { q: 'How satisfied are you with the current options?', opts: ['Very satisfied','Satisfied','Neutral','Unsatisfied','I have no feelings'] },
  { q: 'Would you recommend this to a colleague?', opts: ['Absolutely','Probably','Define "colleague"','No','I work alone'] },
  { q: 'Rate your current decision-making confidence (1–10):', opts: ['1 – I am lost','3 – Uncertain','5 – Fine','8 – Confident','11 – I am the decision'] },
  { q: 'What is your relationship with voting?', opts: ["It's complicated","We're exclusive","On a break","Voting ghosted me","Yes"] },
  { q: 'How did you hear about us?', opts: ['My colleagues','A dream','The void',"I didn't choose it — it chose me",'Huh?'] },
  { q: 'Which best describes your decision philosophy?', opts: ['I think to decide','I decide to think','I avoid deciding','Decisions are a construct','All of the above'] },
  { q: 'How many times have you been victimized by a bad vote outcome?', opts: ['0','1–3','4–10','Too many to count','I AM the bad outcome'] },
];
let _svIdx = 0;

function _survey() {
  if (sessionStorage.getItem('_svd') || document.getElementById('_svo')) return;
  _svIdx = 0;
  const d = document.createElement('div');
  d.id = '_svo';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center';
  document.body.appendChild(d);
  _renderSurvey();
}

function _renderSurvey() {
  const el = document.getElementById('_svo');
  if (!el) return;
  if (_svIdx >= _svQs.length) {
    el.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;max-width:400px;width:90%;text-align:center">
      <div style="font-size:3rem">✅</div>
      <h3 style="margin:8px 0">You're all done!</h3>
      <p style="color:#888;margin:8px 0;font-size:0.8rem">Thank you for completing our 3-question survey.</p>
      <p style="color:#bbb;font-size:0.78rem;margin:0 0 20px">Survey continues on the next page.</p>
      <button onclick="sessionStorage.setItem('_svd','1');document.getElementById('_svo').remove()" style="background:#3b82f6;color:#fff;border:none;padding:9px 22px;border-radius:6px;cursor:pointer;font-weight:600">Continue to Part 2 →</button>
    </div>`;
    return;
  }
  const q = _svQs[_svIdx];
  el.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;max-width:400px;width:90%">
    <h3 style="margin:0 0 2px">Quick Survey</h3>
    <p style="color:#888;font-size:0.76rem;margin:0 0 18px">Question ${_svIdx + 1} of 3 · <span style="color:#bbb">Est. 2 minutes</span></p>
    <div>
      <p style="font-weight:600;margin:0 0 10px;font-size:0.88rem">${escHtml(q.q)}</p>
      ${q.opts.map((o,i) => `<label style="display:block;margin-bottom:5px;font-size:0.86rem;cursor:pointer"><input type="radio" name="_svr" value="${i}"> ${escHtml(o)}</label>`).join('')}
    </div>
    <button onclick="_svNext()" style="background:#3b82f6;color:#fff;border:none;padding:9px 22px;border-radius:6px;cursor:pointer;font-weight:600;margin-top:14px">Next →</button>
    <button onclick="sessionStorage.setItem('_svd','1');document.getElementById('_svo').remove()" style="background:none;border:none;color:#ccc;font-size:0.68rem;cursor:pointer;margin-left:10px">Skip survey</button>
  </div>`;
}

function _svNext() { _svIdx++; _renderSurvey(); }

// ── BALLOT SHITIFICATION ──────────────────────────────────────────────────────
const _fakeItems = [
  { name: 'The Obvious Choice™', field2: 'Sponsored · Best value · Limited time offer' },
  { name: 'Your Second Thought', field2: 'You know the one.' },
  { name: 'Whatever, Fine', field2: "You have other options. Don't pretend you don't." },
];

function _injectBallotChaos() {
  if (!CHAOS_CONFIG.ballotAds) return;
  const container = document.getElementById('round-container');
  if (!container) return;

  // Fake countdown
  const h2 = container.querySelector('.section-hd h2');
  if (h2 && !document.getElementById('_cdt')) {
    const mins = 47 + Math.floor(Math.random() * 93);
    let secs = mins * 60;
    const cdt = document.createElement('div');
    cdt.id = '_cdt';
    cdt.style.cssText = 'color:#ef4444;font-weight:700;font-size:0.8rem;margin-top:2px';
    cdt.textContent = `⏰ Round closes in ${_fmtCdt(secs)}`;
    h2.after(cdt);
    if (_cdtInt) clearInterval(_cdtInt);
    _cdtInt = setInterval(() => {
      secs--;
      if (secs <= 0) { clearInterval(_cdtInt); cdt.textContent = '⏰ ROUND CLOSING NOW!!!'; return; }
      cdt.textContent = `⏰ Round closes in ${_fmtCdt(secs)}`;
    }, 1000);
  }

  // SPONSORED badge on one card
  const opts = container.querySelectorAll('.item-card');
  if (opts.length > 0) {
    const nameEl = opts[0].querySelector('.item-name');
    if (nameEl && !nameEl.querySelector('._spons')) {
      nameEl.insertAdjacentHTML('beforeend', '<span style="background:#1e40af;color:#fff;font-size:0.55rem;padding:2px 5px;border-radius:3px;font-weight:700;letter-spacing:0.5px;vertical-align:middle;margin-left:4px">SPONSORED</span>');
    }
  }

  // Inject ads between cards
  const cardParent = opts[0]?.parentElement;
  if (cardParent) {
    [...opts].forEach((card, i) => {
      if ((i + 1) % 2 === 0 && i < opts.length - 1) {
        const ad = _adData[Math.floor(i / 2) % _adData.length];
        const adEl = document.createElement('div');
        adEl.style.cssText = 'background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px dashed #f59e0b;border-radius:8px;padding:16px;text-align:center;margin:6px 0;position:relative';
        adEl.innerHTML = `<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#000;font-size:0.56rem;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:1px">ADVERTISEMENT</div>
          <div style="font-size:0.95rem;font-weight:700;color:#111;margin:6px 0 3px">${escHtml(ad.h)}</div>
          <div style="font-size:0.76rem;color:#666;margin:0 0 10px">${escHtml(ad.s)}</div>
          <button onclick="alert('You clicked an ad. Big Algorithm™ thanks you.')" style="background:#ef4444;color:#fff;border:none;padding:5px 14px;border-radius:4px;font-size:0.76rem;cursor:pointer;font-weight:600">${escHtml(ad.cta)}</button>`;
        card.after(adEl);
      }
    });

    // "You Might Also Consider"
    if (!document.getElementById('_ymbc') && cardParent) {
      const section = document.createElement('div');
      section.id = '_ymbc';
      section.innerHTML = `<div style="font-size:0.73rem;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px">You Might Also Consider</div>` +
        _fakeItems.map(r => `<div class="card" style="border:2px solid #e0e7ff">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
            <div>
              <div style="font-weight:600;font-size:0.95rem">${escHtml(r.name)} <span style="background:#1e40af;color:#fff;font-size:0.55rem;padding:2px 5px;border-radius:3px;font-weight:700">SPONSORED</span></div>
              <div style="font-size:0.78rem;color:#6b7280;margin-top:2px">${escHtml(r.field2)}</div>
            </div>
            <button onclick="alert('This option is not real.\\n\\n...or is it?')" style="background:#1e40af;color:#fff;border:none;padding:5px 12px;border-radius:20px;font-size:0.76rem;cursor:pointer;font-weight:600;white-space:nowrap">Learn More</button>
          </div>
        </div>`).join('');
      cardParent.appendChild(section);
    }
  }
}

// Watch for ballot render and inject chaos
const _ballotObserver = new MutationObserver(() => {
  const container = document.getElementById('round-container');
  if (container && container.querySelector('.item-card')) _injectBallotChaos();
});
// Observer started in startChaos init block below

function _fmtCdt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

// ── GEO-CHAOS ─────────────────────────────────────────────────────────────────
function _geoChaos() {
  _geoStripe();
  _geoMarquee();
  _geoGifoids();
  _geoCounter();
  _geoNewBadges();
  _geoGutters();
  // inject balloon observer
  const container = document.getElementById('round-container');
  if (container) _ballotObserver.observe(container, { childList: true, subtree: true });
}

function _geoStripe() {
  if (document.getElementById('_geos')) return;
  const d = document.createElement('div');
  d.id = '_geos';
  d.style.cssText = 'background:repeating-linear-gradient(45deg,#f59e0b 0,#f59e0b 20px,#000 20px,#000 40px);padding:10px 0;text-align:center;font-family:"Courier New",monospace;font-weight:900;font-size:0.9rem;color:#fff;text-shadow:2px 2px 0 #000,-1px -1px 0 #000;letter-spacing:3px';
  d.innerHTML = '🚧 &nbsp; UNDER CONSTRUCTION &nbsp; 🚧 &nbsp; PLEASE PARDON OUR DUST &nbsp; 🚧';
  const hba = document.getElementById('_hba');
  if (hba) hba.after(d); else document.body.prepend(d);
}

function _geoMarquee() {
  if (document.getElementById('_mqw')) return;
  const wrap = document.createElement('div');
  wrap.id = '_mqw';
  wrap.style.cssText = 'background:#000080;overflow:hidden';
  const mq = document.createElement('marquee');
  mq.setAttribute('scrollamount','5');
  mq.style.cssText = 'color:#ffff00;padding:5px 0;font-family:"Courier New",monospace;font-size:0.82rem;font-weight:bold';
  mq.innerHTML = '🚧 UNDER CONSTRUCTION 🚧 &nbsp;&nbsp; BEST VIEWED IN NETSCAPE NAVIGATOR 4.0 AT 800×600 &nbsp;&nbsp; 🏆 WINNER: BEST VOTING SITE 1997–2026 &nbsp;&nbsp; ✉️ PLEASE SIGN OUR GUESTBOOK &nbsp;&nbsp; ⚠️ VOTE COUNT EXCEEDS SERVER CAPACITY — PLEASE TRY AGAIN LATER &nbsp;&nbsp; 💾 POWERED BY AI™ &nbsp;&nbsp; 🎵 MIDI MUSIC LOADING... &nbsp;&nbsp;';
  wrap.appendChild(mq);
  const nav = document.querySelector('nav');
  if (nav) nav.after(wrap); else document.body.prepend(wrap);
}

function _geoGifoids() {
  if (document.getElementById('_gif0')) return;
  [
    { id:'_gif0', e:'⭐', s:'top:120px;left:6px;animation:_bounce 0.7s ease-in-out infinite' },
    { id:'_gif1', e:'🚧', s:'top:120px;right:6px;animation:_wobble 0.8s ease-in-out infinite' },
    { id:'_gif2', e:'💾', s:'bottom:160px;left:6px;animation:_bounce 0.9s ease-in-out infinite reverse' },
    { id:'_gif3', e:'🌟', s:'bottom:160px;right:6px;animation:_spin 2s linear infinite' },
    { id:'_gif4', e:'🏗️', s:'top:50%;left:6px;animation:_wobble 1.2s ease-in-out infinite' },
    { id:'_gif5', e:'📧', s:'top:50%;right:6px;animation:_bounce 0.5s ease-in-out infinite' },
  ].forEach(g => {
    const d = document.createElement('div');
    d.id = g.id;
    d.style.cssText = `position:fixed;z-index:9989;pointer-events:none;font-size:2.2rem;line-height:1;${g.s}`;
    d.textContent = g.e;
    document.body.appendChild(d);
  });
}

function _geoCounter() {
  if (document.getElementById('_vcw')) return;
  let count = parseInt(localStorage.getItem('_vcount') || '') || (1000000 + Math.floor(Math.random() * 999999));
  count++;
  localStorage.setItem('_vcount', count);
  const wrap = document.createElement('div');
  wrap.id = '_vcw';
  wrap.style.cssText = 'text-align:center;padding:20px 0 8px';
  wrap.innerHTML = `<div style="display:inline-block;background:#000;color:#00ff00;border:4px ridge #888;padding:12px 20px;font-family:'Courier New',monospace;text-align:center;box-shadow:0 0 12px #00ff0044">
    <span style="font-size:0.6rem;letter-spacing:2px;display:block;color:#00cc00">⚡ YOU ARE VISITOR NUMBER ⚡</span>
    <span style="font-size:1.6rem;font-weight:bold;display:block;letter-spacing:4px">${count.toLocaleString()}</span>
    <span style="font-size:0.6rem;letter-spacing:2px;display:block;color:#00ff88;margin-top:4px">SINCE JANUARY 1, 1997</span>
    <span style="display:block;font-size:0.56rem;color:#ff00ff;animation:_blink 1s step-end infinite;letter-spacing:1px;margin-top:2px">[ THIS SITE IS UNDER CONSTRUCTION ]</span>
  </div>`;
  const main = document.querySelector('main');
  if (main) main.appendChild(wrap);
}

function _geoNewBadges() {
  document.querySelectorAll('nav button').forEach((btn, i) => {
    if (!btn.querySelector('._nb')) {
      const span = document.createElement('span');
      span.className = '_nb';
      span.style.cssText = 'display:inline-block;background:#ff0000;color:#ffff00;font-size:0.5rem;font-weight:900;padding:1px 4px;border-radius:2px;font-family:"Courier New",monospace;margin-left:3px;vertical-align:middle;animation:_newblink 0.5s step-end infinite';
      span.textContent = i === 0 ? 'HOT' : 'NEW!';
      btn.appendChild(span);
    }
  });
}

function _geoGutters() {
  if (document.getElementById('_gutter-l')) return;
  _buildLeftGutter();
  _buildRightGutter();
  _startGutterClock();
  document.body.style.marginLeft = '184px';
  document.body.style.marginRight = '184px';

  const style = document.createElement('style');
  style.textContent = `
    ._gutter{position:fixed;top:0;bottom:0;width:180px;z-index:9988;overflow-y:auto;overflow-x:hidden;font-family:'Courier New',monospace;font-size:0.66rem;background:linear-gradient(180deg,#000080,#000040,#000060,#000080);color:#00ff00;padding:8px 6px;scrollbar-width:none}
    ._gutter::-webkit-scrollbar{display:none}
    ._gutter-l{left:0;border-right:4px ridge #888}
    ._gutter-r{right:0;border-left:4px ridge #888}
    ._gutter-hd{color:#ffff00;font-weight:900;font-size:0.7rem;text-align:center;letter-spacing:1px;margin:10px 0 4px;border-top:2px groove #888;border-bottom:2px groove #888;padding:4px 0;background:rgba(255,255,0,0.08)}
    ._gutter-hr{border:none;border-top:2px ridge #888;margin:8px 0}
    ._gutter a{color:#00ffff;text-decoration:underline}
    ._gutter a:hover{color:#ff00ff}
    ._gutter-btn{display:block;width:100%;background:linear-gradient(180deg,#c0c0c0,#808080);color:#000;border:2px outset #c0c0c0;padding:3px 6px;font-family:'Courier New',monospace;font-size:0.6rem;font-weight:700;cursor:pointer;text-align:center;margin:3px 0}
    ._gutter-btn:hover{background:linear-gradient(180deg,#e0e0e0,#a0a0a0)}
    ._gutter-btn:active{border-style:inset}
    ._gutter-midi{background:#111;border:2px inset #444;padding:6px;margin:6px 0;text-align:center}
    ._gutter-midi-btn{display:inline-block;background:#333;color:#0f0;border:1px solid #0f0;padding:2px 6px;font-family:'Courier New',monospace;font-size:0.58rem;cursor:pointer;margin:2px}
    ._gutter-midi-btn:hover{background:#0f0;color:#000}
    ._gutter-clock{background:#000;border:2px inset #888;padding:6px;margin:6px 0;text-align:center;color:#ff0000;font-size:0.88rem;font-weight:900;letter-spacing:2px;text-shadow:0 0 6px #ff000088}
    ._gutter-tip{background:#330000;border:1px solid #ff0000;padding:5px;margin:6px 0;color:#ff6666;font-size:0.56rem;text-align:center}
    ._gutter-award{display:inline-block;border:3px ridge #c0c0c0;background:#000;padding:6px;margin:4px auto;text-align:center;box-shadow:0 0 8px #ffff0044}
    ._gutter-ring{background:rgba(255,255,255,0.05);border:2px ridge #888;padding:6px;margin:6px 0;text-align:center}
    ._gutter-webcam{background:#111;border:2px groove #666;padding:4px;margin:6px 0;text-align:center;font-size:0.53rem;color:#999}
    ._blink{animation:_blink 1s step-end infinite}
    ._rainbow{animation:_rainbow 2s linear infinite;font-weight:900}
    @keyframes _bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    @keyframes _spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes _wobble{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(15deg)}}
    @keyframes _blink{0%,49%{opacity:1}50%,100%{opacity:0}}
    @keyframes _newblink{0%,49%{background:#ff0000;color:#ffff00}50%,100%{background:#ffff00;color:#ff0000}}
    @keyframes _rainbow{0%{color:#ff0000}16%{color:#ff8800}33%{color:#ffff00}50%{color:#00ff00}66%{color:#0088ff}83%{color:#8800ff}100%{color:#ff0000}}
    @keyframes _sIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes _sOut{from{transform:translateX(0);opacity:1}to{transform:translateX(80px);opacity:0}}
    @keyframes _gscrollV{0%{top:80px}100%{top:-120px}}
    ._subway-surfers{position:fixed;top:50%;left:calc(184px + ((50vw - 360px - 184px)/2));transform:translateY(-50%);width:180px;height:320px;z-index:9987;pointer-events:none;overflow:hidden;border:3px ridge #888;border-radius:8px;box-shadow:0 0 20px rgba(0,0,0,0.6)}
    ._subway-surfers iframe{width:300%;height:100%;border:none;pointer-events:none;margin-left:-100%}
    ._report-btn{position:fixed;z-index:9990;padding:10px 20px;background:#dc3545;color:#fff;border:2px outset #ff6b6b;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap}
    @media(max-width:1200px){._gutter,._subway-surfers,._report-btn{display:none!important}}
  `;
  document.head.appendChild(style);
}

function _buildLeftGutter() {
  const g = document.createElement('div');
  g.id = '_gutter-l'; g.className = '_gutter _gutter-l';
  g.innerHTML = `
    <div class="_gutter-ring"><div style="color:#ffff00;font-weight:900;font-size:0.63rem;margin-bottom:4px">🔗 THE VOTE WEBRING 🔗</div>
    <div style="margin:4px 0"><a href="#" onclick="return false">⬅ Previous</a> | <a href="#" onclick="return false">Random</a> | <a href="#" onclick="return false">Next ➡</a></div>
    <div style="font-size:0.48rem;color:#888;margin-top:4px">Member of 2,847 sites</div></div>
    <div class="_gutter-hd">🏆 SITE AWARDS 🏆</div>
    <div class="_gutter-award"><div style="font-size:1.4rem">🏆</div><div style="color:#ffff00;font-size:0.53rem;font-weight:900">BEST OF THE WEB</div><div style="color:#ff8800;font-size:0.48rem">★★★★★</div><div style="color:#888;font-size:0.43rem">AWARDED 1997</div></div>
    <div class="_gutter-award"><div style="font-size:1.2rem"><span style="display:inline-block;animation:_spin 3s linear infinite">💀</span></div><div style="color:#ff0000;font-size:0.53rem;font-weight:900">SKULL OF APPROVAL</div><div style="color:#666;font-size:0.43rem">GIVEN BY xX_D4RK_Xx</div></div>
    <hr class="_gutter-hr">
    <div class="_gutter-hd">🔥 COOL LINKS 🔥</div>
    <div style="padding:2px 0"><span style="display:inline-block;animation:_wobble 0.3s ease-in-out infinite">🔥</span> <a href="#" onclick="alert('Link rotted in 2003');return false">Dave\'s Poll Page</a></div>
    <div style="padding:2px 0">💀 <a href="#" onclick="alert('ERROR 404: This Geocities page has been permanently archived');return false">SkullZ Vote Zone</a></div>
    <div style="padding:2px 0">⚡ <a href="#" onclick="alert('The webmaster of this site was last seen in 2001');return false">XTREME OPINIONS!!!</a></div>
    <div style="padding:2px 0"><span class="_blink">🆕</span> <a href="#" onclick="alert('This link has been under construction since 1998');return false">NEW! Ballot.com</a></div>
    <div style="padding:2px 0">📧 <a href="#" onclick="alert('mailto:webmaster@vote.geocities.com\\n\\nJust kidding, this email bounced in 1999');return false">Email Webmaster</a></div>
    <hr class="_gutter-hr">
    <div class="_gutter-hd">🎵 NOW PLAYING 🎵</div>
    <div class="_gutter-midi">
      <div id="_midi-song" style="color:#00ff00;font-size:0.53rem;margin-bottom:4px">♫ sandstorm.mid ♫</div>
      <div style="background:#222;height:20px;border:1px inset #444;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;gap:1px;padding:2px">
        ${[60,80,40,70,50,90,45].map(h=>`<div style="width:4px;background:#0f0;height:${h}%;animation:_bounce ${(0.3+Math.random()*0.5).toFixed(1)}s ease infinite"></div>`).join('')}
      </div>
      <span class="_gutter-midi-btn" onclick="_midiChangeSong(-1)">⏮</span>
      <span class="_gutter-midi-btn" onclick="_midiPlay()">⏵</span>
      <span class="_gutter-midi-btn" onclick="_midiStop()">⏸</span>
      <span class="_gutter-midi-btn" onclick="_midiChangeSong(1)">⏭</span>
      <div style="color:#888;font-size:0.46rem;margin-top:4px" id="_midi-status">Click Play to start</div>
    </div>
    <hr class="_gutter-hr">
    <div style="text-align:center;margin:8px 0">
      <button class="_gutter-btn" onclick="alert('Netscape Navigator 4.0 Gold\\n\\nDownload size: 14.2 MB\\nEstimated time on 28.8k modem: 1 hour 12 minutes')">🌐 Best viewed in<br>NETSCAPE 4.0</button>
      <button class="_gutter-btn" onclick="alert('AOL Instant Messenger\\n\\nScreen Name: V0t3r97\\nStatus: 🗳️ brb voting')">💬 AIM: V0t3r97</button>
    </div>`;
  document.body.appendChild(g);
}

function _buildRightGutter() {
  const g = document.createElement('div');
  g.id = '_gutter-r'; g.className = '_gutter _gutter-r';
  g.innerHTML = `
    <div class="_gutter-hd">🕐 SERVER TIME 🕐</div>
    <div class="_gutter-clock" id="_gutter-clock-display">--:--:--</div>
    <div class="_gutter-hd">📹 OFFICE WEBCAM 📹</div>
    <div class="_gutter-webcam"><div style="width:100%;height:60px;background:repeating-linear-gradient(0deg,#111 0,#111 2px,#222 2px,#222 4px);display:flex;align-items:center;justify-content:center;color:#444;font-size:0.68rem">[ NO SIGNAL ]</div>
    <div style="margin-top:3px">Refreshes every 30 sec</div><div style="color:#ff0000;font-size:0.48rem;margin-top:2px" class="_blink">● LIVE</div></div>
    <hr class="_gutter-hr">
    <div class="_gutter-hd"><span class="_rainbow">HOT DEALS!!!</span></div>
    <div class="_gutter-tip"><div class="_blink" style="color:#ff0000;font-weight:900">🚨 ALERT 🚨</div>
    <div style="margin-top:3px">FREE PRIZE for the <span style="color:#ffff00">1,000,000th</span> voter!</div>
    <button class="_gutter-btn" onclick="alert('Congratulations!!!\\n\\nTo claim, please fax your details to 1-800-NOT-REAL.\\n\\nOffer already expired.')">CLAIM NOW!!!</button></div>
    <hr class="_gutter-hr">
    <div class="_gutter-hd">📊 TODAY\'S POLL 📊</div>
    <div style="background:rgba(0,0,0,0.3);border:2px inset #444;padding:6px;margin:6px 0">
      <div style="color:#ffff00;font-size:0.56rem;font-weight:700;margin-bottom:4px">Is this the best voting site ever?</div>
      <div style="margin:2px 0;font-size:0.53rem"><input type="radio" name="_gpoll" checked> Yes</div>
      <div style="margin:2px 0;font-size:0.53rem"><input type="radio" name="_gpoll"> Absolutely</div>
      <div style="margin:2px 0;font-size:0.53rem"><input type="radio" name="_gpoll"> Without question</div>
      <div style="margin:2px 0;font-size:0.53rem"><input type="radio" name="_gpoll"> I need help</div>
      <button class="_gutter-btn" onclick="alert('Results:\\n  Yes: 48%\\n  Absolutely: 31%\\n  Without question: 20%\\n  I need help: 1%\\n\\nTotal votes: 2\\n(Both were the webmaster)')">VOTE!</button>
    </div>
    <hr class="_gutter-hr">
    <div class="_gutter-hd">🔮 HOROSCOPE 🔮</div>
    <div style="background:rgba(128,0,128,0.15);border:2px ridge #800080;padding:6px;margin:6px 0;text-align:center">
      <div style="font-size:1.2rem">🔮</div>
      <div style="color:#ff88ff;font-size:0.53rem;font-style:italic;margin:4px 0">"The stars say you will make a decision today. Mercury is in Retrograde."</div>
      <div style="color:#888;font-size:0.43rem">Updated daily (last update: 03/14/2002)</div>
    </div>
    <hr class="_gutter-hr">
    <div style="border:2px solid #00ff00;background:#000;padding:6px;margin:8px 0;text-align:center">
      <div style="color:#00ff00;font-size:0.58rem;font-weight:900">[ HACKER ZONE ]</div>
      <div style="color:#00ff00;font-size:2rem;animation:_spin 4s linear infinite">💀</div>
      <div style="color:#00ff00;font-size:0.48rem;margin:4px 0" class="_blink">HACK THE PLANET</div>
      <div style="color:#888;font-size:0.43rem">Protected by McAfee VirusScan \'98</div>
    </div>
    <div style="height:80px;overflow:hidden;border:2px groove #888;margin:6px 0;background:#110022;position:relative">
      <div style="animation:_gscrollV 12s linear infinite;position:absolute;width:100%;text-align:center;color:#ff00ff;font-size:0.53rem;font-weight:700;line-height:1.8">
        <div>★ VOTE ★</div><div>★ WIN ★</div><div>★ REPEAT ★</div><div>★ VOTE ★</div><div>★ WIN ★</div><div>★ REPEAT ★</div>
      </div>
    </div>
    <div style="border:1px solid #333;padding:5px;margin:8px 0;font-size:0.4rem;color:#666;text-align:center">
      © 1997-2026 VoteMaster Inc.<br>Not responsible for bad decisions or existential dread.<br>Made with 💔 on a Pentium II
    </div>`;
  document.body.appendChild(g);
}

function _startGutterClock() {
  if (_gutterClockInt) clearInterval(_gutterClockInt);
  _gutterClockInt = setInterval(() => {
    const el = document.getElementById('_gutter-clock-display');
    if (!el) { clearInterval(_gutterClockInt); return; }
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }, 1000);
}

// ── MIDI ENGINE ───────────────────────────────────────────────────────────────
const _SONGS = [
  { name: 'sandstorm.mid', bpm: 136, notes: [
    [246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[0,1],
    [246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[0,3],
    [329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[0,1],
    [293.66,1],[293.66,1],[293.66,1],[293.66,1],[0,4],
    [246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[0,1],
    [246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[246.94,1],[0,3],
    [329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[329.63,1],[0,1],
    [293.66,1],[293.66,1],[293.66,1],[293.66,1],[0,4],
  ]},
  { name: 'smb3_athletic.mid', bpm: 150, notes: [
    [523.25,1],[0,1],[659.25,1],[0,1],[783.99,1],[0,1],[1046.50,1],[0,1],
    [783.99,1],[0,1],[659.25,1],[0,1],[523.25,1],[0,1],[392.00,1],[0,1],
    [587.33,1],[0,1],[739.99,1],[0,1],[880.00,1],[0,1],[1174.66,1],[0,1],
    [880.00,1],[0,1],[739.99,1],[0,1],[587.33,1],[0,1],[440.00,1],[0,1],
    [1046.50,1],[987.77,1],[932.33,1],[880.00,1],[830.61,1],[783.99,1],[739.99,1],[698.46,1],
    [659.25,1],[622.25,1],[587.33,1],[554.37,1],[523.25,4],[0,4],
    [659.25,2],[783.99,2],[880.00,2],[1046.50,2],
    [880.00,2],[783.99,2],[659.25,4],[0,4],
  ]},
  { name: 'tp_hyrule_field.mid', bpm: 108, notes: [
    [440.00,4],[493.88,2],[554.37,2],[587.33,2],[659.25,6],[0,4],
    [739.99,4],[659.25,2],[587.33,2],[554.37,2],[493.88,6],[0,4],
    [440.00,4],[493.88,2],[554.37,2],[659.25,4],[783.99,4],[0,4],
    [880.00,8],[739.99,4],[659.25,4],[0,4],
  ]},
  { name: 'down_by_river.mid', bpm: 96, notes: [
    [440.00,4],[392.00,2],[440.00,2],[0,2],[440.00,2],[392.00,2],[329.63,2],[0,4],
    [293.66,4],[329.63,2],[293.66,2],[0,2],[329.63,2],[293.66,2],[220.00,4],[0,4],
    [440.00,4],[392.00,2],[440.00,2],[0,2],[440.00,2],[392.00,2],[329.63,2],[0,4],
    [220.00,8],[0,4],[293.66,2],[329.63,2],[0,4],
  ]},
];

function _initAc() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); }
function _midiPlay() {
  _initAc();
  if (_ac.state === 'suspended') _ac.resume();
  if (_mPlaying) return;
  _mPlaying = true;
  _mMaster = _ac.createGain(); _mMaster.gain.value = 0.22; _mMaster.connect(_ac.destination);
  _scheduleLoop(_ac.currentTime);
  const s = document.getElementById('_midi-status'); if (s) { s.textContent = '▶ NOW PLAYING'; s.style.color = '#00ff00'; }
  const n = document.getElementById('_midi-song'); if (n) n.textContent = '♫ ' + _SONGS[_currentSongIdx].name + ' ♫';
}
function _midiStop() {
  _mPlaying = false;
  if (_mTimeout) clearTimeout(_mTimeout);
  if (_mMaster) { _mMaster.gain.linearRampToValueAtTime(0, _ac.currentTime + 0.05); _mMaster = null; }
  const s = document.getElementById('_midi-status'); if (s) { s.textContent = '⏹ Stopped'; s.style.color = '#888'; }
}
function _midiChangeSong(dir) {
  const was = _mPlaying; _midiStop();
  _currentSongIdx = (_currentSongIdx + dir + _SONGS.length) % _SONGS.length;
  const n = document.getElementById('_midi-song'); if (n) n.textContent = '♫ ' + _SONGS[_currentSongIdx].name + ' ♫';
  if (was) setTimeout(_midiPlay, 150);
}
function _scheduleLoop(startTime) {
  if (!_mPlaying || !_mMaster) return;
  const song = _SONGS[_currentSongIdx], s16 = 60 / song.bpm / 4;
  let t = startTime;
  song.notes.forEach(([freq, dur]) => {
    const d = dur * s16;
    if (freq > 0) {
      [8,-8].forEach(detune => {
        const osc = _ac.createOscillator(), filter = _ac.createBiquadFilter(), env = _ac.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = detune;
        filter.type = 'lowpass'; filter.frequency.value = 2400; filter.Q.value = 2;
        env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.18, t + 0.006); env.gain.exponentialRampToValueAtTime(0.001, t + d * 0.78);
        osc.connect(filter); filter.connect(env); env.connect(_mMaster);
        osc.start(t); osc.stop(t + d);
      });
    }
    t += d;
  });
  _mTimeout = setTimeout(() => _scheduleLoop(t), (t - startTime) * 1000 - 150);
}
function _clickBlip() {
  _initAc(); if (_ac.state === 'suspended') { _ac.resume().then(_clickBlip); return; }
  if (_ac.state !== 'running') return;
  const freqs = [523,659,784,880,1047];
  const osc = _ac.createOscillator(), env = _ac.createGain();
  osc.type = 'square'; osc.frequency.value = freqs[Math.floor(Math.random()*freqs.length)];
  env.gain.setValueAtTime(0.08, _ac.currentTime); env.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + 0.08);
  osc.connect(env); env.connect(_ac.destination); osc.start(); osc.stop(_ac.currentTime + 0.08);
}

// ── CAT ───────────────────────────────────────────────────────────────────────
function _spawnCat(C = CHAOS_CONFIG) {
  if (document.getElementById('_cat')) return;
  const cat = document.createElement('div');
  cat.id = '_cat';
  cat.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;font-size:2.5rem;line-height:1;user-select:none;left:100px;top:100px';
  cat.textContent = '🐱';
  document.body.appendChild(cat);
  let cx=100,cy=100,mx=300,my=300,state='idle',nearSince=null,gameOver=false;
  const lerp=(a,b,t)=>a+(b-a)*t;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
  function tick(){
    if(!gameOver){
      const d=Math.sqrt((mx-cx)**2+(my-cy)**2);
      if(d<60){if(!nearSince)nearSince=Date.now();else if(Date.now()-nearSince>=500){if(C.catGameOver)_gameOver();return;}}else nearSince=null;
    }
    if(state!=='pounce'){
      const dx=mx-cx,dy=my-cy,dist=Math.sqrt(dx*dx+dy*dy);
      if(Math.abs(dx)>5)cat.style.transform=`scaleX(${dx<0?-1:1})`;
      if(gameOver){requestAnimationFrame(tick);return;}
      if(state==='recover'){cx=lerp(cx,mx-Math.sign(dx)*160,0.025);cy=lerp(cy,my-Math.sign(dy)*160,0.025);}
      else if(dist>320){state='chase';cat.textContent='😾';cx=lerp(cx,mx,0.07);cy=lerp(cy,my,0.07);}
      else if(dist>85){state='stalk';cat.textContent='😼';cx=lerp(cx,mx,0.03);cy=lerp(cy,my,0.03);}
      else if(state!=='recover'){state='pounce';_catPounce(cx,cy,mx,my);}
      if(state!=='pounce'){cat.style.left=cx+'px';cat.style.top=cy+'px';}
    }
    requestAnimationFrame(tick);
  }
  function _catPounce(fx,fy,tx,ty){
    cat.textContent='🙀';let w=0;const dir=fx<tx?1:-1;
    (function wiggle(){w++;cat.style.transform=`scaleX(${dir}) rotate(${Math.sin(w*0.9)*18}deg)`;
    if(w<18)requestAnimationFrame(wiggle);else{cat.style.transform=`scaleX(${dir})`;jump();}})();
    function jump(){const px=(fx+tx)/2,py=Math.min(fy,ty)-130;let t=0;
    (function step(){t++;const p=t/18;cx=(1-p)*(1-p)*fx+2*(1-p)*p*px+p*p*tx;cy=(1-p)*(1-p)*fy+2*(1-p)*p*py+p*p*ty;
    cat.style.left=cx+'px';cat.style.top=cy+'px';if(t<18)requestAnimationFrame(step);
    else{cat.textContent='😸';setTimeout(()=>{if(gameOver)return;cat.textContent='🐱';state='recover';setTimeout(()=>{state='idle';},2500);},700);}})();}
  }
  function _gameOver(){
    gameOver=true;cat.textContent='😺';cat.style.transform='scale(1.4)';
    document.body.style.cursor='url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\'%3E%3Ccircle cx=\'6\' cy=\'6\' r=\'5\' fill=\'%23ff0000\'/%3E%3C/svg%3E") 6 6, none';
    const ov=document.createElement('div');ov.id='_go';
    ov.style.cssText='position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center';
    let secs=5;
    ov.innerHTML=`<div style="font-family:'Courier New',monospace;font-size:clamp(3rem,12vw,9rem);font-weight:900;color:#ff0000;text-shadow:0 0 40px #ff0000;letter-spacing:0.1em">GAME OVER</div>
      <div style="font-family:'Courier New',monospace;font-size:1.1rem;color:#ff6666;margin-top:1rem;letter-spacing:3px">THE CAT HAS WON</div>
      <div style="font-size:4rem;margin-top:1rem">😺</div>
      <button id="_go-btn" style="margin-top:2rem;font-family:'Courier New',monospace;font-size:0.85rem;background:none;border:1px solid #555;color:#aaa;padding:8px 20px;cursor:pointer;letter-spacing:2px">Fine... (<span id="_go-cd">${secs}</span>)</button>`;
    document.body.appendChild(ov);
    function walkAway(){ov.remove();document.body.style.cursor='';cat.textContent='😸';cat.style.transform='scaleX(-1)';
    const tx=15,ty=window.innerHeight-160;
    (function walk(){cx=lerp(cx,tx,0.015);cy=lerp(cy,ty,0.015);cat.style.left=cx+'px';cat.style.top=cy+'px';
    if(Math.sqrt((cx-tx)**2+(cy-ty)**2)>4){requestAnimationFrame(walk);}
    else{cat.textContent='😺';cat.style.transform='';
    const b=document.createElement('div');
    b.style.cssText='position:fixed;z-index:999999;pointer-events:none;font-size:0.78rem;font-weight:600;background:#fff;border:2px solid #333;border-radius:12px 12px 12px 2px;padding:6px 12px;white-space:nowrap;box-shadow:2px 2px 8px rgba(0,0,0,0.3)';
    b.textContent='I love my kitty! 😻';document.body.appendChild(b);
    (function moveBubble(){const f=document.getElementById('_face');if(f&&b.isConnected){b.style.left=(parseFloat(f.style.left)+10)+'px';b.style.top=(parseFloat(f.style.top)-48)+'px';requestAnimationFrame(moveBubble);}})();}})();}
    document.getElementById('_go-btn').addEventListener('click',walkAway);
    const cd=setInterval(()=>{secs--;const e=document.getElementById('_go-cd');if(e)e.textContent=secs;if(secs<=0){clearInterval(cd);walkAway();}},1000);
  }
  tick();
}

// ── FACE ──────────────────────────────────────────────────────────────────────
function _spawnFace() {
  if (document.getElementById('_face')) return;
  const wrap=document.createElement('div');wrap.id='_face';
  wrap.style.cssText='position:fixed;z-index:99997;pointer-events:none;filter:drop-shadow(0 4px 14px rgba(0,0,0,0.8));left:250px;top:250px';
  const img=document.createElement('img');
  img.src = (window.CHAOS_FACE_URL && window.CHAOS_FACE_URL !== '__FACE_IMAGE_URL__')
    ? window.CHAOS_FACE_URL
    : `${PROFESSOR_CHAOS_ORIGIN}/face.png`;
  img.style.cssText='width:110px;height:auto;display:block';
  wrap.appendChild(img);document.body.appendChild(wrap);
  let fx=250,fy=250;const lerp=(a,b,t)=>a+(b-a)*t;
  (function trackCat(){const cat=document.getElementById('_cat');
  if(cat){const prev=fx;fx=lerp(fx,parseFloat(cat.style.left)||0,0.006);fy=lerp(fy,parseFloat(cat.style.top)||0,0.006);
  wrap.style.left=fx+'px';wrap.style.top=fy+'px';
  if(Math.abs(fx-prev)>0.1)img.style.transform=fx>prev?'scaleX(-1)':'scaleX(1)';}
  requestAnimationFrame(trackCat);})();
}

// ── EXIT INTENT ───────────────────────────────────────────────────────────────
function _exitIntent() {
  document.addEventListener('mouseleave', e => {
    if(e.clientY>0||sessionStorage.getItem('_eid'))return;
    sessionStorage.setItem('_eid','1');
    const d=document.createElement('div');
    d.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center';
    d.innerHTML=`<div style="background:#fff;border-radius:12px;padding:32px;max-width:420px;text-align:center;position:relative">
      <div style="font-size:3rem">😿</div>
      <h2 style="margin:8px 0;color:#cc0000;font-family:'Courier New',monospace">WAIT! DON'T GO!</h2>
      <p style="color:#555;margin:8px 0 4px">Your vote is <strong>UNFINISHED</strong>.<br>Your team is counting on you.</p>
      <p style="color:#888;font-size:0.76rem;margin:12px 0">Before you leave — have you considered <strong>Pro™</strong>? Only $4.99/mo.</p>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:#f59e0b;color:#000;border:none;padding:10px 24px;border-radius:6px;font-weight:700;cursor:pointer;margin-right:8px">STAY AND VOTE</button>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:1px solid #ddd;color:#bbb;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:0.7rem">Leave (coward)</button>
    </div>`;
    document.body.appendChild(d);
  });
}

// ── TITLE FLICKER ─────────────────────────────────────────────────────────────
function _startTitleFlicker() {
  const orig=document.title;
  const msgs=['⚠️ Your vote expires soon!','👀 Someone else is about to decide...','🚨 URGENT: Round closing!','😿 Your team misses you!','🔴 1 new round alert'];
  let iv=null;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){let i=0;iv=setInterval(()=>{document.title=i++%2===0?msgs[Math.floor(Math.random()*msgs.length)]:orig;},1500);}
    else{clearInterval(iv);document.title=orig;}
  });
}

// ── RAGE CLICK ────────────────────────────────────────────────────────────────
function _startRageClick() {
  const times=[];
  const snarks=['Clicking faster won\'t make the results change. (Have you tried Pro™?)','Easy there. This is a vote, not a speed run.','Our servers felt that.','That\'s a lot of clicking. Breathe. It\'s just a poll.','We noticed frustration. Big Algorithm™ is concerned about you.'];
  document.addEventListener('click',()=>{const now=Date.now();times.push(now);const recent=times.filter(t=>now-t<2000);if(recent.length>=5){times.length=0;_chaosFlash(snarks[Math.floor(Math.random()*snarks.length)]);}});
}

function _chaosFlash(msg) {
  const f=document.getElementById('flash-area');if(!f)return;
  f.innerHTML=`<div style="padding:0.7rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:0.84rem;border-left:4px solid #ef4444;background:#fef2f2;color:#7f1d1d">${msg}</div>`;
  setTimeout(()=>{if(f)f.innerHTML='';},4000);
}

// ── FAKE NOTIF ────────────────────────────────────────────────────────────────
function _fakeNotifPrompt() {
  if(sessionStorage.getItem('_nfp')||document.getElementById('_nfp'))return;
  sessionStorage.setItem('_nfp','1');
  const d=document.createElement('div');d.id='_nfp';
  d.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100002;background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,0.18);display:flex;align-items:center;gap:14px;min-width:360px;max-width:90vw';
  d.innerHTML=`<div style="font-size:1.6rem">🗳️</div>
    <div style="flex:1"><div style="font-size:0.8rem;font-weight:600;color:#111">This site wants to send notifications</div>
    <div style="font-size:0.73rem;color:#666;margin-top:2px">Round alerts, result announcements, and Big Algorithm™ offers (2–4×/hour)</div></div>
    <button onclick="alert('Subscribed!\\n\\nExpect 2–4 notifications per hour.\\n\\nWelcome. 🗳️');document.getElementById('_nfp').remove()" style="background:#1a73e8;color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:0.76rem;cursor:pointer;white-space:nowrap">Allow</button>
    <button onclick="document.getElementById('_nfp').remove();setTimeout(_fakeNotifPrompt,20000)" style="background:none;border:1px solid #ddd;color:#555;padding:6px 14px;border-radius:4px;font-size:0.76rem;cursor:pointer">Block</button>`;
  document.body.appendChild(d);
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function _startProgressBar() {
  if(document.getElementById('_pb'))return;
  const stall=63+Math.floor(Math.random()*15);
  const d=document.createElement('div');d.id='_pb';
  d.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99990;background:#fff;border-top:1px solid #eee;padding:7px 16px;display:flex;align-items:center;gap:12px;font-size:0.71rem;font-family:"Courier New",monospace';
  d.innerHTML=`<span style="color:#555;white-space:nowrap">⚙️ Personalizing your experience...</span>
    <div style="flex:1;height:7px;background:#eee;border-radius:4px;overflow:hidden"><div id="_pb-f" style="height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);width:0%;transition:width 4s ease;border-radius:4px"></div></div>
    <span id="_pb-p" style="color:#888;min-width:30px">0%</span>
    <span onclick="this.parentElement.remove()" style="color:#ccc;cursor:pointer;font-size:0.9rem">✕</span>`;
  document.body.appendChild(d);
  setTimeout(()=>{
    const fill=document.getElementById('_pb-f'),pct=document.getElementById('_pb-p');
    if(fill)fill.style.width=stall+'%';
    let c=0;const iv=setInterval(()=>{c=Math.min(c+1,stall);if(pct)pct.textContent=c+'%';if(c>=stall)clearInterval(iv);},40);
  },600);
}

// ── FAVICON BADGE ─────────────────────────────────────────────────────────────
function _fakeFaviconBadge() {
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#3b82f6';ctx.beginPath();ctx.roundRect(0,0,32,32,6);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('V',16,23);
  ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(26,6,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText('3',26,10);
  let link=document.querySelector("link[rel*='icon']");
  if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}
  link.href=canvas.toDataURL();
  document.title=document.title+' (3)';
}

// ── TRUCK ─────────────────────────────────────────────────────────────────────
function _truckDriveby() {
  if(document.getElementById('_truck'))return;
  const ltr=Math.random()>0.5,vw=window.innerWidth,truckW=Math.max(vw*1.6,1000),dur=4.5;
  const wheels=Array.from({length:Math.ceil(truckW/90)},()=>`<div style="width:54px;height:54px;border-radius:50%;background:#1a1a1a;border:8px solid #555;flex-shrink:0"></div>`).join('');
  const slogans=['VOTE FREIGHT CO. · EST. 1997','BIG ALGORITHM™ LOGISTICS','DELIVERING DECISIONS SINCE FOREVER','HONK IF YOU LOVE POLLS','THIS TRUCK IS UNDER CONSTRUCTION'];
  const slogan=slogans[Math.floor(Math.random()*slogans.length)];
  const truck=document.createElement('div');truck.id='_truck';
  truck.style.cssText=`position:fixed;top:0;height:100vh;width:${truckW}px;z-index:999995;display:flex;flex-direction:column;${ltr?`left:${-truckW}px`:`left:${vw}px`}`;
  truck.innerHTML=`<div style="flex:1;background:linear-gradient(180deg,#f0f0f0,#d0d0d0 40%,#b8b8b8);border-left:10px solid #888;border-right:10px solid #888;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:18px;background:repeating-linear-gradient(90deg,#cc0000 0,#cc0000 40px,#fff 40px,#fff 80px)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:18px;background:repeating-linear-gradient(90deg,#cc0000 0,#cc0000 40px,#fff 40px,#fff 80px)"></div>
    <div style="text-align:center;font-family:'Courier New',monospace;font-weight:900;letter-spacing:4px;color:#333">
      <div style="font-size:clamp(2rem,5vw,4rem)">🚛 &nbsp; ${escHtml(slogan)} &nbsp; 🚛</div>
      <div style="font-size:clamp(0.8rem,2vw,1.2rem);color:#666;margin-top:8px;letter-spacing:6px">[ WIDE LOAD ]</div>
    </div>
  </div>
  <div style="height:70px;background:#222;display:flex;align-items:center;gap:16px;padding:8px 20px;border-top:6px solid #444">${wheels}</div>`;
  document.body.appendChild(truck);
  requestAnimationFrame(()=>{truck.style.transition=`left ${dur}s linear`;truck.style.left=ltr?`${vw}px`:`${-truckW}px`;});
  setTimeout(()=>truck.remove(),(dur+0.5)*1000);
}

function _scheduleTruck() {
  setTimeout(()=>{_truckDriveby();_scheduleTruck();},30000+Math.random()*40000);
}

// ── FONT CHAOS ────────────────────────────────────────────────────────────────
const _cursedFonts=['"Comic Sans MS","Comic Sans",cursive','"Papyrus",fantasy','"Impact","Arial Black",sans-serif','"Brush Script MT","Brush Script Std",cursive','"Courier New",Courier,monospace','"Georgia","Times New Roman",serif','"Trebuchet MS",Helvetica,sans-serif','fantasy','cursive','"Marker Felt","Marker Felt Thin",fantasy','system-ui,-apple-system,sans-serif'];
let _lastFont=-1,_fontStyle=null;
function _fontChaos(){
  let idx;do{idx=Math.floor(Math.random()*_cursedFonts.length);}while(idx===_lastFont);
  _lastFont=idx;
  if(!_fontStyle){_fontStyle=document.createElement('style');document.head.appendChild(_fontStyle);}
  _fontStyle.textContent=`*,*::before,*::after{font-family:${_cursedFonts[idx]}!important}`;
}
function _startFontChaos(){document.addEventListener('click',_fontChaos);}

// ── INFINITE SCROLL ───────────────────────────────────────────────────────────
let _infActive=false,_infPending=false;
function _startInfScroll(){
  if(_infActive)return;_infActive=true;
  window.addEventListener('scroll',_infCheck,{passive:true});
}
function _infCheck(){
  if(_infPending)return;
  if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-200){
    _infPending=true;
    requestAnimationFrame(()=>{
      const main=document.querySelector('main');if(!main){_infPending=false;return;}
      const clone=main.cloneNode(true);clone.removeAttribute('id');clone.classList.add('_inf-clone');
      clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      document.body.appendChild(clone);_infPending=false;
    });
  }
}

// ── SUBWAY SURFERS ────────────────────────────────────────────────────────────
function _startSubwaySurfers(){
  if(document.getElementById('_subway-surfers'))return;
  const wrap=document.createElement('div');wrap.id='_subway-surfers';wrap.className='_subway-surfers';
  wrap.innerHTML=`<iframe src="https://www.youtube.com/embed/eRXE8Aebp7s?autoplay=1&mute=1&loop=1&playlist=eRXE8Aebp7s&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
  document.body.appendChild(wrap);
}

// ── REPORT BUTTON ─────────────────────────────────────────────────────────────
function _startReportBtn(){
  if(document.getElementById('_report-btn'))return;
  const btn=document.createElement('button');btn.id='_report-btn';
  btn.style.cssText='position:fixed;z-index:9990;padding:10px 20px;background:#dc3545;color:#fff;border:2px outset #ff6b6b;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;right:200px;top:50%';
  btn.textContent='⚠ Report a Problem';
  btn.addEventListener('mouseover',()=>{
    const minX=200,maxX=window.innerWidth-200,minY=60,maxY=window.innerHeight-60;
    let nx,ny;const r=btn.getBoundingClientRect();
    do{nx=minX+Math.random()*(maxX-minX);ny=minY+Math.random()*(maxY-minY);}while(Math.abs(nx-r.left)<120&&Math.abs(ny-r.top)<80);
    btn.style.right='auto';btn.style.left=nx+'px';btn.style.top=ny+'px';
  });
  btn.addEventListener('click',()=>alert('We appreciate your feedback!\n\nYour problem has been reported to /dev/null.\n\nTicket #'+Math.floor(Math.random()*99999)+'\nEstimated response time: heat death of the universe'));
  document.body.appendChild(btn);
}

// ── UTILS (local) ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
