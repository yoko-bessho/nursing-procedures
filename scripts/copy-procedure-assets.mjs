// procedures/**/images/** を public/procedures-assets/<route-path>/images/** へコピーする。
// 静的エクスポートでは public/ 配下しか確実に配信できないため、コンテンツと co-locate した
// 画像をビルド前にミラーする。route-path は URL と同じ「数字プレフィックス除去後」のセグメント。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "procedures");
const DEST_ROOT = path.join(process.cwd(), "public", "procedures-assets");
const PREFIX_RE = /^\d+-/;

const toSegment = (name) => name.replace(PREFIX_RE, "");
const childDirs = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

// 生成物なので毎回作り直す（消えたコンテンツの画像を残さない）。
fs.rmSync(DEST_ROOT, { recursive: true, force: true });

let copied = 0;
for (const majorName of childDirs(ROOT)) {
  const majorAbs = path.join(ROOT, majorName);
  for (const catName of childDirs(majorAbs)) {
    const catAbs = path.join(majorAbs, catName);
    for (const procName of childDirs(catAbs)) {
      const imagesAbs = path.join(catAbs, procName, "images");
      if (!fs.existsSync(imagesAbs)) continue;
      const routePath = [majorName, catName, procName].map(toSegment).join("/");
      const dest = path.join(DEST_ROOT, routePath, "images");
      fs.cpSync(imagesAbs, dest, { recursive: true });
      copied += fs.readdirSync(imagesAbs).length;
    }
  }
}

console.log(`手順アセットをコピーしました（${copied} ファイル）-> ${path.relative(process.cwd(), DEST_ROOT)}/`);
