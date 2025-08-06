// public/script.js (SPA + gacha + rating localStorage + pity)
// NOTE: GANTI GOOGLE_CLIENT_ID dengan milikmu jika belum.
const GOOGLE_CLIENT_ID = "547444245162-lll41k89tlimcjpbqvha0psrmf66arqu.apps.googleusercontent.com";

let waifus = [];
let isRolling = false;

/* -------------------- localStorage keys -------------------- */
const OBS_KEY = 'gacha_observed_v1'; // now stores { counts:[], total:0, pity:[] }
const LAST_KEY = 'gacha_last_v1';
const GOOGLE_USER_KEY = 'google_user_v1';

/* -------------------- Pity config -------------------- */
const PITY_STEP = 0.6;       // percent added per failed roll (base)
const PITY_MAX_BONUS = 50;   // absolute cap in percent

function computePityMultiplier(basePercent) {
  if (basePercent <= 0.2) return 6;   // UR
  if (basePercent <= 1)   return 4;   // SSR
  if (basePercent <= 3)   return 2;   // SR
  return 1;                           // common
}

/* -------------------- Simple pickByPercent (legacy) -------------------- */
function pickByPercent(items) {
  const totalPercent = items.reduce((sum, item) => sum + (Number(item.percent) || 0), 0);
  if (totalPercent <= 0) return items[Math.floor(Math.random() * items.length)];
  const rand = Math.random() * totalPercent;
  let acc = 0;
  for (const item of items) {
    acc += Number(item.percent) || 0;
    if (rand <= acc) return item;
  }
  return items[items.length - 1];
}

/* -------------------- pick with pity -------------------- */
function pickByPercentWithPity(items, pityArr) {
  // build effective percents with pity bonus (absolute add, capped)
  const adjusted = items.map((it, idx) => {
    const base = Number(it.percent) || 0;
    const mult = computePityMultiplier(base);
    const bonus = (Number(pityArr && pityArr[idx] || 0) ) * PITY_STEP * mult;
    const effective = Math.min(base + bonus, base + PITY_MAX_BONUS);
    return { ...it, effectivePercent: effective, originalIndex: idx };
  });

  const totalEffective = adjusted.reduce((s, a) => s + a.effectivePercent, 0);
  if (totalEffective <= 0) return items[Math.floor(Math.random() * items.length)];

  const rand = Math.random() * totalEffective;
  let acc = 0;
  for (const a of adjusted) {
    acc += a.effectivePercent;
    if (rand <= acc) return a;
  }
  return adjusted[adjusted.length - 1];
}

/* -------------------- confetti & pop (unchanged) -------------------- */
function launchConfetti(count = 60) {
  const canvasId = 'confetti-canvas';
  let canvas = document.getElementById(canvasId);
  let created = false;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    Object.assign(canvas.style, { position:'fixed', left:0, top:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 9999 });
    document.body.appendChild(canvas);
    created = true;
  }
  const ctx = canvas.getContext('2d');
  function setSize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setSize();
  const onResize = () => setSize();
  window.addEventListener('resize', onResize);

  const colors = ['#ff4d6d','#ffd166','#06d6a0','#4d6bff','#ff6bcb','#9b5cff'];
  const parts = [];
  for (let i=0;i<count;i++){
    parts.push({
      x: Math.random()*window.innerWidth,
      y: -10 - Math.random()*200,
      vx:(Math.random()-0.5)*6,
      vy:2+Math.random()*4,
      r:4+Math.random()*8,
      c: colors[Math.floor(Math.random()*colors.length)]
    });
  }
  let start = performance.now();
  let rafId = null;
  function draw(t){
    const dt = t - start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let p of parts){
      p.vy += 0.05;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r*0.6, 0, 0, Math.PI*2);
      ctx.fill();
    }
    if (dt < 2600) rafId = requestAnimationFrame(draw);
    else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      window.removeEventListener('resize', onResize);
      if (created && canvas && canvas.parentNode) {
        setTimeout(()=>{ try{ canvas.parentNode.removeChild(canvas); }catch(e){} }, 200);
      }
      if (rafId) cancelAnimationFrame(rafId);
    }
  }
  rafId = requestAnimationFrame(draw);
}

function playPopSound() {
  try {
    const CtxClass = window.AudioContext || window.webkitAudioContext;
    if (!CtxClass) return;
    const ctx = new CtxClass();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(()=>{});
    }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type='sine'; o.frequency.value = 400 + Math.random()*200;
    g.gain.value = 0.0005;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.stop(ctx.currentTime + 0.18);
    setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 400);
  } catch (e){ /* ignore */ }
}

/* -------------------- UI helpers -------------------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function createImageElement(src, alt){
  const img = document.createElement('img');
  img.src = src; img.alt = alt; img.loading='lazy'; img.width=300;
  img.onerror = ()=> img.src = 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#222"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="16">Gagal memuat gambar</text></svg>');
  return img;
}

/* -------------------- Data load (images.json) -------------------- */
async function loadData(){
  try {
    const res = await fetch('/images.json', {cache:'no-store'});
    if (!res.ok) throw new Error('images.json tidak ditemukan');
    waifus = await res.json();
    waifus = waifus.map((w,i)=>({ name: w.name || `Waifu ${i+1}`, url: w.url||'', percent: Number(w.percent)||0 }));
    preloadImages(waifus.map(w=>w.url));
    buildRateList();
    showLastPickIfAny();
  } catch (err){
    console.error(err);
    const rl = document.getElementById('rateList');
    if (rl) rl.innerHTML = `<div class="meta">Gagal memuat images.json: ${escapeHtml(err.message)}</div>`;
  }
}
function preloadImages(urls){ urls.forEach(u=>{ if (!u) return; const i=new Image(); i.src=u; }); }

/* -------------------- Build rate list UI (with normalize toggle + pity) -------------------- */
let normalizedCache = null;
function buildRateList(){
  const total = waifus.reduce((s,w)=>s+(Number(w.percent)||0),0);
  normalizedCache = waifus.map(w=>({ ...w, normalizedPercent: total>0 ? (Number(w.percent)/total)*100 : 100/waifus.length }));
  const list = document.getElementById('rateList');
  if (!list) return;
  list.innerHTML = `
    <div class="meta" id="totalPercent">Total percent: ${total.toFixed(2)}%</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <button id="normalizeBtn" class="ghost">Toggle Normalize View</button>
      <div class="small">(Normalized = peluang aktual berdasarkan total bobot)</div>
    </div>
    <div id="rateRows">
      ${normalizedCache.map((w,idx)=>`
        <div class="rate-item">
          <div>
            <strong>${escapeHtml(w.name)}</strong>
            <div class="small">Observed: <span id="observed-${idx}">0.00%</span> • Count: <span id="count-${idx}">0</span> • Pity: <span id="pity-${idx}">0.00%</span></div>
          </div>
          <div style="text-align:right;">
            <div id="displayPct-${idx}">${Number(w.percent).toFixed(2)}%</div>
            <div class="small">(${w.normalizedPercent.toFixed(2)}%)</div>
          </div>
        </div>`).join('')}
    </div>
  `;
  const btn = document.getElementById('normalizeBtn');
  if (btn) {
    btn.addEventListener('click', ()=>{
      const showing = btn.dataset.showing === '1';
      waifus.forEach((w,idx)=>{
        const d = document.getElementById(`displayPct-${idx}`);
        if (!d) return;
        d.textContent = showing ? `${Number(w.percent).toFixed(2)}%` : `${normalizedCache[idx].normalizedPercent.toFixed(2)}%`;
      });
      btn.dataset.showing = showing ? '0' : '1';
      btn.textContent = showing ? 'Toggle Normalize View' : 'Show Raw Percents';
    });
  }
  refreshObservedFromStorage();
}

/* -------------------- Observed counters (localStorage includes pity) -------------------- */
function loadObserved(){
  try {
    const raw = localStorage.getItem(OBS_KEY);
    if (!raw) return { counts: [], total: 0, pity: [] };
    const parsed = JSON.parse(raw);
    // ensure structure
    return {
      counts: Array.isArray(parsed.counts) ? parsed.counts : [],
      total: Number(parsed.total) || 0,
      pity: Array.isArray(parsed.pity) ? parsed.pity : []
    };
  } catch(e){ return { counts:[], total:0, pity:[] }; }
}
function saveObserved(obj){ localStorage.setItem(OBS_KEY, JSON.stringify(obj)); }

function refreshObservedFromStorage(){
  const obs = loadObserved();
  if (!waifus.length) return;
  // normalize counts/pity length
  if (!Array.isArray(obs.counts) || obs.counts.length !== waifus.length) obs.counts = new Array(waifus.length).fill(0);
  if (!Array.isArray(obs.pity)   || obs.pity.length !== waifus.length)   obs.pity   = new Array(waifus.length).fill(0);
  if (!obs.total) obs.total = obs.counts.reduce((s,v)=>s+(Number(v)||0),0);

  // save back normalized structure (for future runs)
  saveObserved(obs);

  waifus.forEach((w,idx)=>{
    const countEl = document.getElementById(`count-${idx}`);
    const obsEl = document.getElementById(`observed-${idx}`);
    const pityEl = document.getElementById(`pity-${idx}`);
    if (countEl) countEl.textContent = String(obs.counts[idx] || 0);
    if (obsEl) {
      const pct = obs.total > 0 ? (100 * (obs.counts[idx] || 0) / obs.total) : 0;
      obsEl.textContent = `${pct.toFixed(2)}%`;
    }
    if (pityEl) {
      const base = Number(w.percent) || 0;
      const bonus = Math.min((obs.pity[idx] || 0) * PITY_STEP * computePityMultiplier(base), PITY_MAX_BONUS);
      pityEl.textContent = `${bonus.toFixed(2)}%`;
    }
  });

  const totalEl = document.getElementById('totalPercent');
  if (totalEl) {
    const totalDefined = waifus.reduce((s,w)=>s+(Number(w.percent)||0),0);
    totalEl.textContent = `Total percent: ${totalDefined.toFixed(2)}% • Rolls: ${obs.total||0}`;
  }
}

function incrementObservedAndPity(pickedIdx){
  const obs = loadObserved();
  if (!Array.isArray(obs.counts) || obs.counts.length !== waifus.length) obs.counts = new Array(waifus.length).fill(0);
  if (!Array.isArray(obs.pity)   || obs.pity.length !== waifus.length)   obs.pity   = new Array(waifus.length).fill(0);
  obs.counts[pickedIdx] = (obs.counts[pickedIdx] || 0) + 1;
  // reset pity for picked, increment for others
  obs.pity = obs.pity.map((v, idx) => idx === pickedIdx ? 0 : (Number(v||0) + 1));
  obs.total = (Number(obs.total) || 0) + 1;
  saveObserved(obs);
  refreshObservedFromStorage();
}

/* -------------------- last pick storage -------------------- */
function saveLastPick(picked){
  try { localStorage.setItem(LAST_KEY, JSON.stringify(picked)); } catch(e){}
}
function loadLastPick(){
  try { const raw = localStorage.getItem(LAST_KEY); return raw ? JSON.parse(raw) : null; } catch(e){ return null; }
}
function showLastPickIfAny(){
  const last = loadLastPick();
  if (!last) return;
  const resultDiv = document.getElementById('result');
  if (!resultDiv) return;
  resultDiv.innerHTML = `<h2>(Terakhir) ${escapeHtml(last.name)}</h2>`;
  resultDiv.appendChild(createImageElement(last.url, last.name));
}

/* -------------------- Gacha roll logic (uses pity) -------------------- */
async function rollGacha(){
  if (isRolling) return;
  if (!waifus.length) { alert('Data waifu belum dimuat!'); return; }
  isRolling = true;
  const btn = document.getElementById('rollBtn');
  if (btn) btn.disabled = true;
  const resultDiv = document.getElementById('result');
  if (!resultDiv) { if (btn) btn.disabled = false; isRolling = false; return; }
  resultDiv.innerHTML = `<h2>🎰 Rolling...</h2>`;

  try {
    const spin = 10;
    for (let i=0;i<spin;i++){
      const r = pickByPercent(waifus); // quick visual spin uses base weights for variety
      resultDiv.innerHTML = `<h3 class="small">🎲 ...</h3>`;
      const img = createImageElement(r.url, r.name);
      resultDiv.appendChild(img);
      try { playPopSound(); } catch(e){}
      img.style.transform = 'scale(0.96)';
      await new Promise(rp=>setTimeout(rp, 50 + i*25));
      img.style.transform = 'scale(1)';
    }

    // load pity array
    const obs = loadObserved();
    if (!Array.isArray(obs.pity) || obs.pity.length !== waifus.length) obs.pity = new Array(waifus.length).fill(0);

    // pick using pity-adjusted percents
    const pickedItem = pickByPercentWithPity(waifus, obs.pity);
    // pickedItem may be an adjusted object — find original index
    const pickedIdx = ('originalIndex' in pickedItem) ? pickedItem.originalIndex : waifus.findIndex(w => w.url === pickedItem.url);

    // show final
    resultDiv.innerHTML = `<h2>${escapeHtml(pickedItem.name)}</h2>`;
    resultDiv.appendChild(createImageElement(pickedItem.url, pickedItem.name));

    // rarity classes for visual
    const rarityClasses = ['rarity-ur','rarity-ssr','rarity-sr','rarity-rare','rarity-common'];
    resultDiv.classList.remove(...rarityClasses);
    const pickedBasePercent = Number((waifus[pickedIdx] && waifus[pickedIdx].percent) || 0);
    if (pickedBasePercent <= 0.5) resultDiv.classList.add('rarity-ur');
    else if (pickedBasePercent <= 1) resultDiv.classList.add('rarity-ssr');
    else if (pickedBasePercent <= 5) resultDiv.classList.add('rarity-sr');
    else if (pickedBasePercent <= 15) resultDiv.classList.add('rarity-rare');
    else resultDiv.classList.add('rarity-common');

    try { playPopSound(); } catch(e){}
    launchConfetti(pickedBasePercent <= 1 ? 220 : (pickedBasePercent <= 5 ? 120 : 60));

    // update observed + pity
    if (pickedIdx >= 0) incrementObservedAndPity(pickedIdx);
    saveLastPick({ name: pickedItem.name, url: pickedItem.url, ts: Date.now(), percent: pickedBasePercent });
  } catch (err) {
    console.error('Error in rollGacha:', err);
    if (resultDiv) resultDiv.innerHTML = `<div class="meta">Terjadi kesalahan saat rolling. Cek console.</div>`;
  } finally {
    if (btn) btn.disabled = false;
    isRolling = false;
  }
}

/* -------------------- Router (SPA nav) -------------------- */
function initNav(){
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const target = b.dataset.target;
      document.querySelectorAll('.page').forEach(p=> p.classList.add('hidden'));
      const sec = document.getElementById(target);
      if (sec) sec.classList.remove('hidden');
    });
  });
}

/* -------------------- Google Sign-In integration (avatar + logout) -------------------- */
function updateGoogleButtonUI(userPayload) {
  const btn = document.getElementById('googleSignBtn');
  const logoutBtn = document.getElementById('googleLogoutBtn');
  const avatar = document.getElementById('googleAvatar');
  if (!btn || !logoutBtn || !avatar) return;

  if (userPayload && (userPayload.name || userPayload.email)) {
    btn.textContent = userPayload.name || userPayload.email;
    avatar.src = userPayload.picture || '';
    avatar.style.display = userPayload.picture ? 'inline-block' : 'none';
    logoutBtn.style.display = 'inline-block';
    btn.dataset.loggedIn = '1';
    btn.onclick = null;
  } else {
    btn.textContent = 'Login (Google)';
    avatar.style.display = 'none';
    logoutBtn.style.display = 'none';
    btn.dataset.loggedIn = '0';
    btn.onclick = null;
  }
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'googleLogoutBtn') {
    localStorage.removeItem(GOOGLE_USER_KEY);
    updateGoogleButtonUI(null);
    const nameEl = document.getElementById('nameInput');
    const anonEl = document.getElementById('anonChk');
    if (nameEl) nameEl.value = '';
    if (anonEl) anonEl.checked = true;
  }
});

function initGoogleStub(){
  const btn = document.getElementById('googleSignBtn');
  if (!btn) return;

  try {
    const saved = localStorage.getItem(GOOGLE_USER_KEY);
    if (saved) {
      const payload = JSON.parse(saved);
      updateGoogleButtonUI(payload);
      const nameEl = document.getElementById('nameInput');
      const anonEl = document.getElementById('anonChk');
      if (nameEl && payload.name) nameEl.value = payload.name;
      if (anonEl) anonEl.checked = false;
    } else {
      updateGoogleButtonUI(null);
    }
  } catch(e){
    console.warn('Failed reading google user from storage', e);
  }

  btn.addEventListener('click', () => {
    if (btn.dataset.loggedIn === '1') return;

    if (!window.google || !google.accounts || !google.accounts.id) {
      alert('Google Identity Services belum tersedia. Pastikan <script src="https://accounts.google.com/gsi/client" async defer></script> sudah ada di HTML.');
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      google.accounts.id.prompt();
    } catch (err) {
      console.error('GSI init error', err);
      alert('Gagal memulai Google Sign-In. Periksa console.');
    }
  });
}

function handleCredentialResponse(response) {
  if (!response || !response.credential) {
    console.warn('No credential received', response);
    return;
  }
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(payload));
    updateGoogleButtonUI(payload);
    const nameEl = document.getElementById('nameInput');
    const anonEl = document.getElementById('anonChk');
    if (nameEl && payload.name) nameEl.value = payload.name;
    if (anonEl) anonEl.checked = false;
    console.log('Google user:', payload);
  } catch (e) {
    console.error('Failed decoding Google credential', e);
  }
}

/* -------------------- optional reset helpers -------------------- */
function resetObserved(){
  try { localStorage.removeItem(OBS_KEY); refreshObservedFromStorage(); } catch(e){}
}

/* -------------------- Init on DOM ready -------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initNav();
  initGoogleStub();

  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.addEventListener('click', rollGacha);
  document.addEventListener('keydown', e => { if (e.key.toLowerCase()==='r') rollGacha(); });

  const ro = document.getElementById('resetStatsLocal');
  if (ro) ro.addEventListener('click', ()=> {
    if (!confirm('Reset semua stats lokal?')) return;
    localStorage.removeItem(OBS_KEY);
    localStorage.removeItem(LAST_KEY);
    refreshObservedFromStorage();
    const resultDiv = document.getElementById('result');
    if (resultDiv) resultDiv.innerHTML = `<div class="small">Stats direset — klik Roll Gacha untuk mulai lagi</div>`;
  });

  loadData();
});
