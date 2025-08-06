// public/script.js (SPA + gacha + comments & rating localStorage)
// NOTE: jika kamu punya confetti/sound lebih lengkap, replace launchConfetti() & playPopSound() dengan versi lama.

let waifus = [];
let isRolling = false;

/* -------------------- localStorage keys -------------------- */
const COMMENTS_KEY = 'gacha_comments_v1';
const OBS_KEY = 'gacha_observed_v1';
const LAST_KEY = 'gacha_last_v1';

/* -------------------- Simple pickByPercent (no pity in this file) -------------------- */
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

/* -------------------- minimal confetti & pop (replace if you have better) -------------------- */
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
  // handle pixel ratio and dynamic sizing
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
      // cleanup
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
    // close context shortly after to free resources
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
    // after building rate list, also show last pick if any
    showLastPickIfAny();
  } catch (err){
    console.error(err);
    const rl = document.getElementById('rateList');
    if (rl) rl.innerHTML = `<div class="meta">Gagal memuat images.json: ${escapeHtml(err.message)}</div>`;
  }
}
function preloadImages(urls){ urls.forEach(u=>{ if (!u) return; const i=new Image(); i.src=u; }); }

/* -------------------- Build rate list UI (with normalize toggle) -------------------- */
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
            <div class="small">Observed: <span id="observed-${idx}">0.00%</span> • Count: <span id="count-${idx}">0</span></div>
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
  // refresh observed if stored
  refreshObservedFromStorage();
}

/* -------------------- Comments & rating (localStorage) -------------------- */
function loadComments(){
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function saveComments(arr){ localStorage.setItem(COMMENTS_KEY, JSON.stringify(arr)); }
function renderComments(){
  const list = document.getElementById('commentsList');
  if (!list) return;
  const items = loadComments();
  if (!items.length) { list.innerHTML = `<div class="small">Belum ada komentar — jadi yang pertama!</div>`; return; }
  list.innerHTML = items.slice().reverse().map(it=>`
    <div class="comment-item">
      <div class="comment-meta">
        <div><strong>${escapeHtml(it.name||'Anonim')}</strong> • ${'★'.repeat(it.rating)}${'☆'.repeat(5-it.rating)}</div>
        <div class="small">${new Date(it.ts).toLocaleString()}</div>
      </div>
      <div class="comment-body">${escapeHtml(it.text)}</div>
    </div>
  `).join('');
}

/* handle comment form */
function initCommentForm(){
  const stars = Array.from(document.querySelectorAll('#ratingInput .star'));
  let rating = 5;
  function setStar(v){
    rating = v;
    stars.forEach(s=> s.classList.toggle('active', Number(s.dataset.value) <= v) );
  }
  stars.forEach(s=>{
    s.addEventListener('click', ()=> setStar(Number(s.dataset.value)) );
  });
  setStar(5);

  const sendBtn = document.getElementById('sendComment');
  if (sendBtn) {
    sendBtn.addEventListener('click', ()=>{
      const nameEl = document.getElementById('nameInput');
      const commentEl = document.getElementById('commentInput');
      const anonEl = document.getElementById('anonChk');
      const name = nameEl ? nameEl.value.trim() : '';
      const text = commentEl ? commentEl.value.trim() : '';
      const anon = anonEl ? anonEl.checked : false;
      if (!text) { alert('Tulis komentar dulu.'); return; }
      const entry = { name: anon ? '' : (name || 'Anonim'), text, rating, ts: Date.now() };
      const arr = loadComments();
      arr.push(entry);
      saveComments(arr);
      if (commentEl) commentEl.value = '';
      renderComments();
    });
  }
  renderComments();
}

/* -------------------- Observed counters (simple localStorage) -------------------- */
function loadObserved(){
  try {
    const raw = localStorage.getItem(OBS_KEY);
    return raw ? JSON.parse(raw) : { counts: [], total:0 };
  } catch(e){ return { counts:[], total:0 }; }
}
function saveObserved(obj){ localStorage.setItem(OBS_KEY, JSON.stringify(obj)); }
function refreshObservedFromStorage(){
  const obs = loadObserved();
  if (!waifus.length) return;
  if (!Array.isArray(obs.counts) || obs.counts.length !== waifus.length){
    obs.counts = new Array(waifus.length).fill(0);
    obs.total = 0;
    saveObserved(obs);
  }
  waifus.forEach((w,idx)=>{
    const countEl = document.getElementById(`count-${idx}`);
    const obsEl = document.getElementById(`observed-${idx}`);
    if (countEl) countEl.textContent = String(obs.counts[idx]||0);
    if (obsEl) {
      const pct = obs.total>0 ? (100 * (obs.counts[idx]||0) / obs.total) : 0;
      obsEl.textContent = `${pct.toFixed(2)}%`;
    }
  });
  const totalEl = document.getElementById('totalPercent');
  if (totalEl) {
    const totalDefined = waifus.reduce((s,w)=>s+(Number(w.percent)||0),0);
    totalEl.textContent = `Total percent: ${totalDefined.toFixed(2)}% • Rolls: ${obs.total||0}`;
  }
}
function incrementObserved(idx){
  const obs = loadObserved();
  if (!Array.isArray(obs.counts) || obs.counts.length !== waifus.length) obs.counts = new Array(waifus.length).fill(0);
  obs.counts[idx] = (obs.counts[idx]||0) + 1;
  obs.total = (obs.total||0) + 1;
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

/* -------------------- Gacha roll logic (visuals + increment observed) -------------------- */
async function rollGacha(){
  if (isRolling) return;
  if (!waifus.length) { alert('Data waifu belum dimuat!'); return; }
  isRolling = true;
  const btn = document.getElementById('rollBtn'); 
  if (btn) btn.disabled = true;
  const resultDiv = document.getElementById('result');
  if (!resultDiv) { if (btn) btn.disabled = false; isRolling = false; return; }
  resultDiv.innerHTML = `<h2>🎰 Rolling...</h2>`;

  // animasi preview
  const spin = 10;
  for (let i=0;i<spin;i++){
    const r = pickByPercent(waifus);
    resultDiv.innerHTML = `<h3 class="small">🎲 ...</h3>`;
    const img = createImageElement(r.url, r.name);
    resultDiv.appendChild(img);
    try { playPopSound(); } catch(e){}
    img.style.transform = 'scale(0.96)';
    await new Promise(rp=>setTimeout(rp, 50 + i*25));
    img.style.transform = 'scale(1)';
  }

  // hasil final
  const picked = pickByPercent(waifus);
  resultDiv.innerHTML = `<h2>${escapeHtml(picked.name)}</h2>`;
  resultDiv.appendChild(createImageElement(picked.url, picked.name));

  // hapus kelas rarity lama & set yang baru
  const rarityClasses = ['rarity-ur','rarity-ssr','rarity-sr','rarity-rare','rarity-common'];
  resultDiv.classList.remove(...rarityClasses);
  if (picked.percent <= 0.5) resultDiv.classList.add('rarity-ur');
  else if (picked.percent <= 1) resultDiv.classList.add('rarity-ssr');
  else if (picked.percent <= 5) resultDiv.classList.add('rarity-sr');
  else if (picked.percent <= 15) resultDiv.classList.add('rarity-rare');
  else resultDiv.classList.add('rarity-common');

  // efek suara & confetti
  try { playPopSound(); } catch(e){}
  launchConfetti(picked.percent <= 1 ? 220 : (picked.percent <= 5 ? 120 : 60));

  // counter & last pick
  const idx = waifus.findIndex(w=>w.url === picked.url);
  if (idx >= 0) incrementObserved(idx);
  saveLastPick({ name: picked.name, url: picked.url, ts: Date.now(), percent: picked.percent });

  if (btn) btn.disabled = false;
  isRolling = false;
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

/* -------------------- Safe Google Sign-In integration (replace initGoogleStub) -------------------- */
function initGoogleStub(){
  const btn = document.getElementById('googleSignBtn');
  if (!btn) return;

  // Jika user sudah login sebelumnya, muat data tapi jangan paksa alert (UI non-blocking)
  try {
    const savedUser = localStorage.getItem("googleUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      console.log("User sudah login sebelumnya:", userData);
      // contoh: update UI jika kamu punya elemen profil, jangan gunakan alert di load
      const profileEl = document.getElementById('googleProfileName');
      if (profileEl) profileEl.textContent = `Hi, ${userData.name}`;
    }
  } catch(e){
    console.warn('Gagal membaca googleUser dari localStorage', e);
  }

  // Bind klik dengan safe guard: cek apakah Google Identity sudah tersedia
  btn.addEventListener('click', async () => {
    try {
      if (!window.google || !google.accounts || !google.accounts.id) {
        alert('Google Identity Services belum tersedia. Pastikan <script src="https://accounts.google.com/gsi/client"></script> ada di HTML dan sudah termuat.');
        return;
      }

      // Initialize once (harus dipanggil sekali)
      google.accounts.id.initialize({
        client_id: "PASTE_CLIENT_ID_KAMU_DI_SINI",
        callback: handleCredentialResponse
      });

      // Tampilkan prompt
      google.accounts.id.prompt();
    } catch (err) {
      console.error('GSI error:', err);
      alert('Terjadi kesalahan saat memulai Google Sign-In. Lihat console untuk detail.');
    }
  });
}

// Handler tetap seperti ini:
function handleCredentialResponse(response) {
  if (!response || !response.credential) {
    console.warn('No credential in response', response);
    return;
  }
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    console.log('Google payload', payload);
    // Simpan profil (public) ke localStorage
    localStorage.setItem("googleUser", JSON.stringify(payload));
    // Update UI contoh
    const profileEl = document.getElementById('googleProfileName');
    if (profileEl) profileEl.textContent = `Hi, ${payload.name}`;
    // tampilan singkat
    alert(`Halo ${payload.name}, kamu login pakai Google!`);
  } catch (e) {
    console.error('GSI decode error', e);
  }
}




/* -------------------- optional reset helpers (if you add buttons in HTML) -------------------- */
function resetObserved(){
  try { localStorage.removeItem(OBS_KEY); refreshObservedFromStorage(); } catch(e){}
}
function resetComments(){
  try { localStorage.removeItem(COMMENTS_KEY); renderComments(); } catch(e){}
}

/* -------------------- Init on DOM ready -------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initNav();
  initCommentForm();
  initGoogleStub();

  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.addEventListener('click', rollGacha);
  document.addEventListener('keydown', e => { if (e.key.toLowerCase()==='r') rollGacha(); });

  // optional reset buttons
  const ro = document.getElementById('resetObservedBtn');
  if (ro) ro.addEventListener('click', ()=> { if(confirm('Reset observed counters?')) resetObserved(); });
  const rc = document.getElementById('resetCommentsBtn');
  if (rc) rc.addEventListener('click', ()=> { if(confirm('Reset comments?')) resetComments(); });

  loadData();
});
