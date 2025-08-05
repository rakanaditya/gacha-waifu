const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'waifu_links.txt');
const outputFile = path.join(__dirname, '..', 'public', 'images.json');

if (!fs.existsSync(inputFile)) {
  console.error('File waifu_links.txt tidak ditemukan di folder tools/');
  process.exit(1);
}

const lines = fs.readFileSync(inputFile, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

const waifus = lines.map((line, i) => {
  const parts = line.split(',').map(v => v.trim());
  const url = parts[0] || '';
  const percentStr = parts[1] || '0';
  const percent = parseFloat(percentStr.replace('%','')) || 0;

  return {
    name: `Waifu ${i + 1}`,
    url,
    percent
  };
});

fs.writeFileSync(outputFile, JSON.stringify(waifus, null, 2));
console.log(`✅ Berhasil membuat images.json dengan ${waifus.length} waifu -> ${outputFile}`);
