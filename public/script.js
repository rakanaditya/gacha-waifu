let waifus = [];
let isRolling = false;

function pickByPercent(items) {
  const totalPercent = items.reduce((sum, item) => sum + (Number(item.percent) || 0), 0);
  if (totalPercent <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  const rand = Math.random() * totalPercent;
  let acc = 0;
  for (const item of items) {
    acc += Number(item.percent) || 0;
    if (rand <= acc) return item;
  }
  return items[items.length - 1];
}

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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
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

  btn.disabled = false;
  isRolling = false;
}

document.getElementById("rollBtn").addEventListener("click", rollGacha);
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    rollGacha();
  }
});

loadData();
