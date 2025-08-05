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
    const img = new Image();
    img.src = url;
  });
}

/* -------------------- Confetti System -------------------- */
/*
  - Creates a fullscreen canvas and draws particle confetti.
  - call launchConfetti(count, durationMs)
*/
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
  // size the canvas
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

  // particle factory
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
      // simple physics
      p.vy += 0.05; // gravity
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

    // fade out near the end
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

/* -------------------- Data loading -------------------- */
async function loadData() {
  try {
    const res = await fetch('/images.json', { cache: "no-store" });
    if (!res.ok) throw new Error('Gagal mengambil data waifu (status ' + res.status + ')');
    waifus = await res.json();

    waifus = waifus.map((w, i) => ({
      name: w.name || `Waifu ${i + 1}`,
      url: w.url || '',
      percent: Number(w.percent) || 0
    }));

    preloadImages(waifus.map(w => w.url));

    const list = document.getElementById("rateList");
    const total = waifus.reduce((s, w) => s + w.percent, 0);

    list.innerHTML = `
      <div class="meta">Total percent: ${total.toFixed(2)}%</div>
      ${waifus.map(w =>
        `<div class="rate-item"><span>${escapeHtml(w.name)}</span><span>${w.percent.toFixed(2)}%</span></div>`
      ).join('')}
    `;
  } catch (err) {
    console.error(err);
    alert("Gagal memuat data waifu: " + err.message + "\nPastikan file public/images.json tersedia dan dijalankan lewat server (bukan file:///)");
  }
}

/* -------------------- Roll logic (memanggil confetti) -------------------- */
async function rollGacha() {
  if (isRolling) return;
  if (!waifus.length) return alert("Data waifu belum dimuat!");
  isRolling = true;
  const btn = document.getElementById("rollBtn");
  btn.disabled = true;

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `<h2>🎰 Rolling...</h2>`;

  const spinCount = 12;
  for (let i = 0; i < spinCount; i++) {
    const random = waifus[Math.floor(Math.random() * waifus.length)];
    resultDiv.innerHTML = `<h3 class="small">🎲 ...</h3>`;
    const img = createImageElement(random.url, random.name);
    resultDiv.appendChild(img);
    img.style.transform = 'scale(0.96)';
    const waitMs = 40 + (i * 30);
    await new Promise(r => setTimeout(r, waitMs));
    img.style.transform = 'scale(1)';
  }

  const picked = pickByPercent(waifus);
  resultDiv.innerHTML = `<h2>${escapeHtml(picked.name)}</h2>`;
  const finalImg = createImageElement(picked.url, picked.name);
  resultDiv.appendChild(finalImg);

  finalImg.style.transform = 'scale(0.92)';
  setTimeout(() => finalImg.style.transform = 'scale(1)', 120);

  // confetti intensity: lebih banyak jika percent <= 5 (langka)
  const rarityThreshold = 5;
  if (!isNaN(picked.percent) && picked.percent <= rarityThreshold) {
    launchConfetti(160, 3000); // besar & lama untuk rare
  } else {
    launchConfetti(60, 2000); // biasa
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
