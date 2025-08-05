// public/script.js (pity improved — per-rarity multiplier)
let waifus = [];
let isRolling = false;

/* -------------------- Pity config -------------------- */
const PITY_STEP = 0.6;       // base percent added per failed roll (tweak this)
const PITY_MAX_BONUS = 50;   // cap absolute bonus (in percent)

/* Multiplier to make pity stronger for low-base items.
   We compute multiplier from base percent via simple rules below. */
const PITY_MULTIPLIER_BY_RARITY = {
  // we'll compute multiplier dynamically: smaller base -> larger multiplier
  // these constants are reference, actual multiplier computed in function
};

/* -------------------- Storage keys & stats -------------------- */
const STORAGE_KEY = 'gacha_stats_v1';
let counters = [];
let totalRolls = 0;
let pityCounters = [];

/* -------------------- Utilities -------------------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function createImageElement(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.width = 300;
  img.onerror = () => {
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#222"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="16">Gagal memuat gambar</text></svg>`
    );
  };
  return img;
}

/* -------------------- Preload images -------------------- */
function preloadImages(urls) {
  urls.forEach(url => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

/* -------------------- Confetti & sound (same as before) -------------------- */
function createConfettiCanvas() {
  let canvas = document.getElementById('confetti-canvas');
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 9999
  });
  document.body.appendChild(canvas);
  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.getContext('2d').setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  return canvas;
}
function launchConfetti(particleCount = 60, duration = 2500) {
  const canvas = createConfettiCanvas();
  const ctx = canvas.getContext('2d');
  const W = window.innerWidth, H = window.innerHeight;
  const colors = ['#ff4d6d','#ffd166','#06d6a0','#4d6bff','#ff6bcb','#9b5cff'];
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 10 + 6;
    particles.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      size, rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      ttl: duration + Math.random() * 400
    });
  }
  let start = performance.now(), rafId;
  function draw(now) {
    const elapsed = now - start;
    ctx.clearRect(0,0,W,H);
    for (let p of particles) {
      p.vy += 0.05; p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      else { ctx.beginPath(); ctx.ellipse(0,0,p.size/2,p.size*0.35,0,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    const t = Math.min(1, elapsed/duration);
    if (t > 0.85) { ctx.fillStyle = `rgba(0,0,0,${(t-0.85)/0.15})`; ctx.fillRect(0,0,W,H); }
    if (elapsed < duration + 600) rafId = requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,W,H); cancelAnimationFrame(rafId); }
  }
  rafId = requestAnimationFrame(draw);
}
let audioCtx = null;
function ensureAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playPopSound(intensity = 1) {
  ensureAudioCtx(); const ctx = audioCtx; const now = ctx.currentTime;
  const bufferSize = 0.1 * ctx.sampleRate; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random()*2 - 1) * Math.exp(-5 * i / bufferSize);
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.001 * intensity, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.16 * intensity, now + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  noise.connect(noiseGain).connect(ctx.destination);
  const osc = ctx.createOscillator(); const oscGain = ctx.createGain(); osc.type = 'sine';
  osc.frequency.setValueAtTime(300 * (1 + Math.random()*0.5), now);
  oscGain.gain.setValueAtTime(0.0008 * intensity, now);
  oscGain.gain.exponentialRampToValueAtTime(0.12 * intensity, now + 0.006);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(oscGain).connect(ctx.destination);
  noise.start(now); osc.start(now); noise.stop(now + 0.18); osc.stop(now + 0.18);
}

/* -------------------- Storage load/save -------------------- */
function loadStats(waifusLength) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.counters) && parsed.counters.length === waifusLength) {
        counters = parsed.counters.map(n => Number(n) || 0);
        pityCounters = (Array.isArray(parsed.pityCounters) && parsed.pityCounters.length === waifusLength)
          ? parsed.pityCounters.map(n => Number(n)||0)
          : new Array(waifusLength).fill(0);
        totalRolls = Number(parsed.totalRolls) || counters.reduce((s,v)=>s+v,0);
        return;
      }
    }
  } catch(e){}
  counters = new Array(waifusLength).fill(0);
  pityCounters = new Array(waifusLength).fill(0);
  totalRolls = 0;
  saveStats();
}
function saveStats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ counters, totalRolls, pityCounters })); }
  catch (e) { console.warn('Could not save stats', e); }
}
function resetStats() {
  counters = new Array(waifus.length).fill(0);
  pityCounters = new Array(waifus.length).fill(0);
  totalRolls = 0;
  saveStats();
  updateCountersUI();
}

/* -------------------- Helpers for pity multiplier -------------------- */
/* Compute multiplier based on basePercent:
   - very small base -> larger multiplier
   - medium base -> moderate multiplier
   - large base -> multiplier 1 (no extra)
*/
function computePityMultiplier(basePercent) {
  if (basePercent <= 0.2) return 6;   // ultra rare: big boost
  if (basePercent <= 1)   return 4;   // ssr: strong boost
  if (basePercent <= 3)   return 2;   // sr: mild boost
  return 1;                           // common/others: normal
}

/* -------------------- Effective pick with pity -------------------- */
function pickByPercentWithPity(items, pityArr) {
  const adjusted = items.map((it, idx) => {
    const base = Number(it.percent) || 0;
    const mult = computePityMultiplier(base);
    const bonus = (pityArr[idx] || 0) * PITY_STEP * mult;
    const effective = Math.min(base + bonus, base + PITY_MAX_BONUS);
    return { ...it, effectivePercent: effective };
  });

  const totalEffective = adjusted.reduce((s,a) => s + a.effectivePercent, 0);
  if (totalEffective <= 0) return items[Math.floor(Math.random()*items.length)];

  const rand = Math.random() * totalEffective;
  let acc = 0;
  for (const a of adjusted) {
    acc += a.effectivePercent;
    if (rand <= acc) return a;
  }
  return adjusted[adjusted.length-1];
}

/* -------------------- Update counters UI -------------------- */
function updateCountersUI() {
  const totalEl = document.getElementById('totalPercent');
  if (totalEl) {
    const totalDefined = waifus.reduce((s,w) => s + (Number(w.percent)||0), 0);
    totalEl.textContent = `Total percent: ${totalDefined.toFixed(2)}% • Rolls: ${totalRolls}`;
  }
  waifus.forEach((w, idx) => {
    const countEl = document.getElementById(`count-${idx}`);
    const obsEl = document.getElementById(`observed-${idx}`);
    const pityEl = document.getElementById(`pity-${idx}`);
    if (countEl) countEl.textContent = String(counters[idx] || 0);
    if (obsEl) {
      const observedPct = totalRolls > 0 ? (100 * (Number(counters[idx]||0) / totalRolls)) : 0;
      obsEl.textContent = `${observedPct.toFixed(2)}%`;
    }
    if (pityEl) {
      const bonus = Math.min((pityCounters[idx]||0) * PITY_STEP * computePityMultiplier(Number(w.percent)||0), PITY_MAX_BONUS);
      pityEl.textContent = `${bonus.toFixed(2)}%`;
    }
  });
}

/* -------------------- Data loading & UI build -------------------- */
async function loadData() {
  try {
    const res = await fetch('/images.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Gagal mengambil data waifu (status ' + res.status + ')');
    waifus = await res.json();

    waifus = waifus.map((w,i) => ({
      name: w.name || `Waifu ${i+1}`,
      url: w.url || '',
      percent: Number(w.percent) || 0
    }));

    preloadImages(waifus.map(w => w.url));
    const total = waifus.reduce((s,w) => s + (Number(w.percent)||0), 0);
    const normalized = waifus.map(w => ({ ...w, normalizedPercent: total>0 ? (Number(w.percent)/total)*100 : 100/waifus.length }));

    loadStats(waifus.length);

    const list = document.getElementById('rateList');
    list.innerHTML = `
      <div class="meta" id="totalPercent">Total percent: ${total.toFixed(2)}% • Rolls: ${totalRolls}</div>
      <div style="margin-top:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="normalizeBtn" style="padding:6px 10px; font-size:13px; border-radius:6px; cursor:pointer;">Toggle Normalize View</button>
        <button id="resetStatsBtn" style="padding:6px 10px; font-size:13px; border-radius:6px; cursor:pointer; background:#444;color:#fff;">Reset Stats</button>
        <div class="small" style="color:#cfcfcf;">(Normalized = actual chance based on total weights). Observed = actual drop % from rolls. Pity = current bonus added to base %.</div>
      </div>
      <div style="height:8px"></div>
      <div id="rateRows">
        ${normalized.map((w, idx) => `
          <div class="rate-item">
            <div style="display:flex; gap:8px; align-items:center; width:100%; justify-content:space-between;">
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <span>${escapeHtml(w.name)}</span>
                <span class="small" style="color:#bdbdbd; margin-top:4px;">
                  Observed: <span id="observed-${idx}">0.00%</span> • Count: <span id="count-${idx}">0</span> • Pity: <span id="pity-${idx}">0.00%</span>
                </span>
              </div>
              <div style="text-align:right;">
                <div id="displayPct-${idx}">${Number(w.percent).toFixed(2)}%</div>
                <div class="small" style="color:#bdbdbd;">(${w.normalizedPercent.toFixed(2)}%)</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    updateCountersUI();

    // normalize toggle
    const normalizeBtn = document.getElementById('normalizeBtn');
    let showingNormalized = false;
    normalizeBtn.addEventListener('click', () => {
      showingNormalized = !showingNormalized;
      waifus.forEach((w, idx) => {
        const display = document.getElementById(`displayPct-${idx}`);
        if (!display) return;
        display.textContent = showingNormalized ? `${normalized[idx].normalizedPercent.toFixed(2)}%` : `${Number(w.percent).toFixed(2)}%`;
      });
      normalizeBtn.textContent = showingNormalized ? 'Show Raw Percents' : 'Toggle Normalize View';
    });

    // reset
    const resetBtn = document.getElementById('resetStatsBtn');
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset semua statistik (counters, pity, and total rolls)?')) return;
      resetStats();
    });

  } catch (err) {
    console.error(err);
    alert('Gagal memuat data waifu: ' + err.message + '\nPastikan file public/images.json tersedia dan dijalankan lewat server (bukan file:///).');
  }
}

/* -------------------- Rarity label helper -------------------- */
function getRarityLabel(percent) {
  if (isNaN(percent)) return { key: 'common', text: 'Common' };
  const thresholds = { ur: 0.2, ssr: 1, sr: 3, rare: 6 };
  if (percent <= thresholds.ur) return { key: 'ur', text: 'UR' };
  if (percent <= thresholds.ssr) return { key: 'ssr', text: 'SSR' };
  if (percent <= thresholds.sr) return { key: 'sr', text: 'SR' };
  if (percent <= thresholds.rare) return { key: 'rare', text: 'Rare' };
  return { key: 'common', text: 'Common' };
}

function showRarityLabel(rarityObj) {
  let label = document.getElementById('rarity-label');
  const resultDiv = document.getElementById('result');
  let content = document.getElementById('resultContent');
  if (!content) {
    content = document.createElement('div'); content.id = 'resultContent';
    while (resultDiv.firstChild) {
      if (resultDiv.firstChild.id === 'rarity-label') break;
      content.appendChild(resultDiv.firstChild);
    }
    resultDiv.appendChild(content);
  }
  if (!label) {
    label = document.createElement('div'); label.id = 'rarity-label'; label.className = 'rarity-label';
    resultDiv.insertBefore(label, content);
  }
  const txt = rarityObj.text || 'Common'; const key = rarityObj.key || 'common';
  const iconText = key === 'ssr' ? '★' : (key === 'rare' ? '✦' : '•');
  label.className = `rarity-label rarity-${key} show`;
  label.innerHTML = `
    <div class="badge">
      <span class="icon">${iconText}</span>
      <span class="text">${txt}</span>
    </div>
    <span class="subtitle small">${key.toUpperCase()}</span>
  `;
  setTimeout(() => label.classList.add('settled'), 420);
}

/* -------------------- Roll logic (with pity) -------------------- */
async function rollGacha() {
  if (isRolling) return;
  if (!waifus.length) return alert('Data waifu belum dimuat!');
  isRolling = true;
  const btn = document.getElementById('rollBtn'); if (btn) btn.disabled = true;

  const resultDiv = document.getElementById('result');
  let content = document.getElementById('resultContent');
  if (!content) {
    content = document.createElement('div'); content.id = 'resultContent';
    while (resultDiv.firstChild) content.appendChild(resultDiv.firstChild);
    resultDiv.appendChild(content);
  }

  content.innerHTML = `<h2>🎰 Rolling...</h2>`;
  const spinCount = 12;
  for (let i=0; i<spinCount; i++) {
    const random = waifus[Math.floor(Math.random() * waifus.length)];
    content.innerHTML = `<h3 class="small">🎲 ...</h3>`;
    const img = createImageElement(random.url, random.name);
    content.appendChild(img);
    try { playPopSound(0.18); } catch(e){}
    img.style.transform = 'scale(0.96)';
    await new Promise(r => setTimeout(r, 40 + i*30));
    img.style.transform = 'scale(1)';
  }

  const picked = pickByPercentWithPity(waifus, pityCounters);

  // update stats
  totalRolls = (totalRolls || 0) + 1;
  const pickedIndex = waifus.findIndex(w => w.url === picked.url);
  if (pickedIndex >= 0) {
    counters[pickedIndex] = (counters[pickedIndex] || 0) + 1;
    // reset picked pity, increment others
    pityCounters = pityCounters.map((v, idx) => idx === pickedIndex ? 0 : (Number(v||0)+1));
    saveStats();
    updateCountersUI();
  }

  const rarity = getRarityLabel(picked.percent);
  showRarityLabel(rarity);

  await new Promise(r => setTimeout(r, 520));

  content.innerHTML = `<h2>${escapeHtml(picked.name)}</h2>`;
  const finalImg = createImageElement(picked.url, picked.name);
  content.appendChild(finalImg);

  try{
    if (rarity.key === 'ur') { playPopSound(1.2); setTimeout(()=>playPopSound(0.9),90); }
    else if (rarity.key === 'ssr') { playPopSound(1.0); setTimeout(()=>playPopSound(0.7),80); }
    else if (rarity.key === 'sr') playPopSound(0.9);
    else if (rarity.key === 'rare') playPopSound(0.7);
    else playPopSound(0.45);
  } catch(e){}

  finalImg.style.transform = 'scale(0.92)';
  setTimeout(()=>finalImg.style.transform='scale(1)',120);

  // confetti scaled by rarity
  if (rarity.key === 'ur') launchConfetti(300,3800);
  else if (rarity.key === 'ssr') launchConfetti(220,3500);
  else if (rarity.key === 'sr') launchConfetti(160,3000);
  else if (rarity.key === 'rare') launchConfetti(110,2400);
  else launchConfetti(60,1800);

  if (btn) btn.disabled = false;
  isRolling = false;
}

/* -------------------- Event bindings & init -------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.addEventListener('click', rollGacha);
  document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r') rollGacha(); });
});
