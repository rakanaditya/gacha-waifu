// public/script.js (full — replace existing file)
let waifus = [];
let isRolling = false;

/* -------------------- pickByPercent & util -------------------- */
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

/* -------------------- Confetti System -------------------- */
function createConfettiCanvas() {
  let canvas = document.getElementById('confetti-canvas');
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 9999,
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
  const W = window.innerWidth;
  const H = window.innerHeight;
  const colors = ['#ff4d6d','#ffd166','#06d6a0','#4d6bff','#ff6bcb','#9b5cff'];

  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 10 + 6;
    particles.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      size,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      ttl: duration + Math.random() * 400
    });
  }

  let start = performance.now();
  let rafId;

  function draw(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    for (let p of particles) {
      p.vy += 0.05;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size/2, p.size*0.35, 0, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    const t = Math.min(1, elapsed / duration);
    if (t > 0.85) {
      ctx.fillStyle = `rgba(0,0,0,${(t-0.85)/0.15})`;
      ctx.fillRect(0,0,W,H);
    }

    if (elapsed < duration + 600) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, W, H);
      cancelAnimationFrame(rafId);
    }
  }

  rafId = requestAnimationFrame(draw);
}

/* -------------------- Pop sound (Web Audio) -------------------- */
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playPopSound(intensity = 1) {
  ensureAudioCtx();
  const ctx = audioCtx;
  const now = ctx.currentTime;

  const bufferSize = 0.1 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-5 * i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001 * intensity, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.16 * intensity, now + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  noise.connect(noiseGain).connect(ctx.destination);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300 * (1 + Math.random()*0.5), now);
  oscGain.gain.setValueAtTime(0.0008 * intensity, now);
  oscGain.gain.exponentialRampToValueAtTime(0.12 * intensity, now + 0.006);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(oscGain).connect(ctx.destination);

  noise.start(now);
  osc.start(now);
  noise.stop(now + 0.18);
  osc.stop(now + 0.18);
}

/* -------------------- Counters / localStorage stats -------------------- */
const STORAGE_KEY = 'gacha_stats_v1';
let counters = [];   // int array aligned with waifus
let totalRolls = 0;

function loadCounters(waifusLength) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.counters) && parsed.counters.length === waifusLength) {
        counters = parsed.counters.map(n => Number(n) || 0);
        totalRolls = Number(parsed.totalRolls) || counters.reduce((s, v) => s + v, 0);
        return;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  counters = new Array(waifusLength).fill(0);
  totalRolls = 0;
  saveCounters();
}

function saveCounters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ counters, totalRolls }));
  } catch (e) {
    console.warn('Could not save gacha stats to localStorage', e);
  }
}

function resetCounters() {
  counters = new Array(waifus.length).fill(0);
  totalRolls = 0;
  saveCounters();
  updateCountersUI();
}

/* -------------------- Update counters UI (observed percents) -------------------- */
function updateCountersUI() {
  const totalEl = document.getElementById('totalPercent');
  if (totalEl) {
    const totalDefined = waifus.reduce((s, w) => s + (Number(w.percent) || 0), 0);
    totalEl.textContent = `Total percent: ${totalDefined.toFixed(2)}% • Rolls: ${totalRolls}`;
  }

  waifus.forEach((w, idx) => {
    const countEl = document.getElementById(`count-${idx}`);
    const obsEl = document.getElementById(`observed-${idx}`);
    if (countEl) countEl.textContent = String(counters[idx] || 0);
    if (obsEl) {
      const observedPct = totalRolls > 0 ? (100 * (Number(counters[idx] || 0) / totalRolls)) : 0;
      obsEl.textContent = `${observedPct.toFixed(2)}%`;
    }
  });
}

/* -------------------- Data loading (with normalize UI & counters) -------------------- */
async function loadData() {
  try {
    const res = await fetch('/images.json', { cache: "no-store" });
    if (!res.ok) throw new Error('Gagal mengambil data waifu (status ' + res.status + ')');
    waifus = await res.json();

    // sanitize & ensure numbers
    waifus = waifus.map((w, i) => ({
      name: w.name || `Waifu ${i + 1}`,
      url: w.url || '',
      percent: Number(w.percent) || 0
    }));

    // Preload images for smooth animation
    preloadImages(waifus.map(w => w.url));

    // compute total percent
    const total = waifus.reduce((s, w) => s + (Number(w.percent) || 0), 0);

    // compute normalized chance (relative %) for display
    const normalized = waifus.map(w => {
      const rel = (total > 0) ? (Number(w.percent) / total) * 100 : (100 / waifus.length);
      return {
        ...w,
        normalizedPercent: rel
      };
    });

    // init/load counters from localStorage
    loadCounters(waifus.length);

    // build UI: total, normalize toggle, reset stats button, and rows showing both defined percent and actual chance
    const list = document.getElementById("rateList");
    list.innerHTML = `
      <div class="meta" id="totalPercent">Total percent: ${total.toFixed(2)}% • Rolls: ${totalRolls}</div>
      <div style="margin-top:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="normalizeBtn" style="padding:6px 10px; font-size:13px; border-radius:6px; cursor:pointer;">Toggle Normalize View</button>
        <button id="resetStatsBtn" style="padding:6px 10px; font-size:13px; border-radius:6px; cursor:pointer; background:#444;color:#fff;">Reset Stats</button>
        <div class="small" style="color:#cfcfcf;">(Normalized = actual chance based on total weights). Observed = actual drop % from rolls.</div>
      </div>
      <div style="height:8px"></div>
      <div id="rateRows">
        ${normalized.map((w, idx) => 
          `<div class="rate-item">
             <div style="display:flex; gap:8px; align-items:center; width:100%; justify-content:space-between;">
               <div style="display:flex; flex-direction:column; align-items:flex-start;">
                 <span>${escapeHtml(w.name)}</span>
                 <span class="small" style="color:#bdbdbd; margin-top:4px;">
                   Observed: <span id="observed-${idx}">0.00%</span> • Count: <span id="count-${idx}">0</span>
                 </span>
               </div>
               <div style="text-align:right;">
                 <div id="displayPct-${idx}">${Number(w.percent).toFixed(2)}%</div>
                 <div class="small" style="color:#bdbdbd;">(${w.normalizedPercent.toFixed(2)}%)</div>
               </div>
             </div>
           </div>`
        ).join('')}
      </div>
    `;

    // set initial observed counts based on loaded counters
    updateCountersUI();

    // normalize toggle
    const normalizeBtn = document.getElementById('normalizeBtn');
    let showingNormalized = false;
    normalizeBtn.addEventListener('click', () => {
      showingNormalized = !showingNormalized;
      waifus.forEach((w, idx) => {
        const display = document.getElementById(`displayPct-${idx}`);
        if (display) {
          display.textContent = showingNormalized ? `${normalized[idx].normalizedPercent.toFixed(2)}%` : `${Number(w.percent).toFixed(2)}%`;
        }
      });
      normalizeBtn.textContent = showingNormalized ? 'Show Raw Percents' : 'Toggle Normalize View';
    });

    // reset button
    const resetBtn = document.getElementById('resetStatsBtn');
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset semua statistik (counters dan total rolls)?')) return;
      resetCounters();
    });

  } catch (err) {
    console.error(err);
    alert("Gagal memuat data waifu: " + err.message + "\nPastikan file public/images.json tersedia dan dijalankan lewat server (bukan file:///)"); 
  }
}

/* -------------------- Rarity label helper -------------------- */
function getRarityLabel(percent) {
  if (isNaN(percent)) return { key: 'common', text: 'Common' };

  const thresholds = {
    ur: 0.2,
    ssr: 1,
    sr: 3,
    rare: 6
  };

  if (percent <= thresholds.ur) return { key: 'ur', text: 'UR' };
  if (percent <= thresholds.ssr) return { key: 'ssr', text: 'SSR' };
  if (percent <= thresholds.sr) return { key: 'sr', text: 'SR' };
  if (percent <= thresholds.rare) return { key: 'rare', text: 'Rare' };
  return { key: 'common', text: 'Common' };
}

/* showRarityLabel (persistent) */
function showRarityLabel(rarityObj) {
  let label = document.getElementById('rarity-label');
  const resultDiv = document.getElementById('result');

  let content = document.getElementById('resultContent');
  if (!content) {
    content = document.createElement('div');
    content.id = 'resultContent';
    while (resultDiv.firstChild) {
      if (resultDiv.firstChild.id === 'rarity-label') break;
      content.appendChild(resultDiv.firstChild);
    }
    resultDiv.appendChild(content);
  }

  if (!label) {
    label = document.createElement('div');
    label.id = 'rarity-label';
    label.className = 'rarity-label';
    resultDiv.insertBefore(label, content);
  }

  const txt = rarityObj.text || 'Common';
  const key = rarityObj.key || 'common';
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

/* -------------------- Roll logic (increment counters + confetti + sound) -------------------- */
async function rollGacha() {
  if (isRolling) return;
  if (!waifus.length) return alert("Data waifu belum dimuat!");
  isRolling = true;
  const btn = document.getElementById("rollBtn");
  btn.disabled = true;

  const resultDiv = document.getElementById("result");
  let content = document.getElementById('resultContent');
  if (!content) {
    content = document.createElement('div');
    content.id = 'resultContent';
    while (resultDiv.firstChild) content.appendChild(resultDiv.firstChild);
    resultDiv.appendChild(content);
  }

  content.innerHTML = `<h2>🎰 Rolling...</h2>`;

  const spinCount = 12;
  for (let i = 0; i < spinCount; i++) {
    const random = waifus[Math.floor(Math.random() * waifus.length)];
    content.innerHTML = `<h3 class="small">🎲 ...</h3>`;
    const img = createImageElement(random.url, random.name);
    content.appendChild(img);

    try { playPopSound(0.18); } catch (e) { /* ignore if audio blocked */ }

    img.style.transform = 'scale(0.96)';
    const waitMs = 40 + (i * 30);
    await new Promise(r => setTimeout(r, waitMs));
    img.style.transform = 'scale(1)';
  }

  const picked = pickByPercent(waifus);

  // increment counters (persist & update UI)
  const pickedIndex = waifus.findIndex(w => w.url === picked.url);
  if (pickedIndex >= 0) {
    counters[pickedIndex] = (counters[pickedIndex] || 0) + 1;
    totalRolls = (totalRolls || 0) + 1;
    saveCounters();
    updateCountersUI();
  }

  const rarity = getRarityLabel(picked.percent);
  showRarityLabel(rarity);

  await new Promise(r => setTimeout(r, 520));

  content.innerHTML = `<h2>${escapeHtml(picked.name)}</h2>`;
  const finalImg = createImageElement(picked.url, picked.name);
  content.appendChild(finalImg);

  try {
    if (rarity.key === 'ur') {
      playPopSound(1.2);
      setTimeout(() => playPopSound(0.9), 90);
    } else if (rarity.key === 'ssr') {
      playPopSound(1.0);
      setTimeout(() => playPopSound(0.7), 80);
    } else if (rarity.key === 'sr') {
      playPopSound(0.9);
    } else if (rarity.key === 'rare') {
      playPopSound(0.7);
    } else {
      playPopSound(0.45);
    }
  } catch (e) { /* ignore */ }

  finalImg.style.transform = 'scale(0.92)';
  setTimeout(() => finalImg.style.transform = 'scale(1)', 120);

  if (rarity.key === 'ur') {
    launchConfetti(300, 3800);
  } else if (rarity.key === 'ssr') {
    launchConfetti(220, 3500);
  } else if (rarity.key === 'sr') {
    launchConfetti(160, 3000);
  } else if (rarity.key === 'rare') {
    launchConfetti(110, 2400);
  } else {
    launchConfetti(60, 1800);
  }

  btn.disabled = false;
  isRolling = false;
}

/* -------------------- Event bindings -------------------- */
document.getElementById("rollBtn").addEventListener("click", rollGacha);
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    rollGacha();
  }
});

/* -------------------- Init -------------------- */
loadData();
