// tools/gen_images.js
const fs = require("fs");
const path = require("path");

const linksFile = path.join(__dirname, "..", "waifu_links.txt");
if (!fs.existsSync(linksFile)) {
  console.error("❌ File waifu_links.txt tidak ditemukan!");
  process.exit(1);
}

const urls = fs.readFileSync(linksFile, "utf-8")
  .split("\n")
  .map(line => line.trim())
  .filter(Boolean);

const waifus = urls.map((url, index) => ({
  name: `Waifu ${index + 1}`,
  url,
  weight: 1 // bisa ubah manual nanti
}));

const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

fs.writeFileSync(
  path.join(publicDir, "images.json"),
  JSON.stringify(waifus, null, 2)
);

console.log(`✅ Berhasil membuat images.json (${waifus.length} waifu)`);
