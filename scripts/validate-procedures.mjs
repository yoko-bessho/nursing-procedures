// procedures/ のディレクトリ規約を検査する。build 前（prebuild）に実行し、規約違反があれば
// 非 0 終了してビルドを止める。ここを唯一の強制ポイントにして、ローダー側は正データ前提で書く。
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.join(process.cwd(), "procedures");
const DIR_NAME_RE = /^\d{2,}-[a-z0-9-]+$/; // 2 桁以上の数字 + '-' + 小文字コード
const PREFIX_RE = /^(\d+)-/;

const errors = [];
const rel = (p) => path.relative(process.cwd(), p);

function childDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// 同一階層のディレクトリ名を検査し、名前規約・セグメント一意性・並び順番号の重複を見る。
function checkSiblings(dirs, parentAbs) {
  const segments = new Map();
  const orders = new Map();
  for (const name of dirs) {
    const at = rel(path.join(parentAbs, name));
    if (!DIR_NAME_RE.test(name)) {
      errors.push(`${at}: ディレクトリ名が規約に合いません（^\\d{2,}-[a-z0-9-]+$）`);
      continue;
    }
    const segment = name.replace(PREFIX_RE, "");
    if (segments.has(segment)) {
      errors.push(`${at}: プレフィックス除去後のセグメント "${segment}" が ${segments.get(segment)} と重複`);
    } else {
      segments.set(segment, name);
    }
    const order = Number.parseInt(name.match(PREFIX_RE)[1], 10);
    if (orders.has(order)) {
      errors.push(`${at}: 並び順番号 ${order} が ${orders.get(order)} と重複`);
    } else {
      orders.set(order, name);
    }
  }
}

function requireFrontmatterTitle(file) {
  if (!fs.existsSync(file)) {
    errors.push(`${rel(file)}: 必須ファイルがありません`);
    return null;
  }
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  if (typeof data.title !== "string" || data.title.trim() === "") {
    errors.push(`${rel(file)}: frontmatter の title が未設定`);
  }
  return { data, content };
}

// index.md 本文が参照する images/*.ext の実体が同ディレクトリにあるか検査する。
function checkReferencedImages(procAbs, content) {
  const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = imgRe.exec(content))) {
    const src = m[1].trim();
    if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(src) || src.startsWith("/")) continue;
    const abs = path.join(procAbs, src.replace(/^\.\//, ""));
    if (!fs.existsSync(abs)) {
      errors.push(`${rel(path.join(procAbs, "index.md"))}: 参照画像が存在しません -> ${src}`);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error("procedures/ がありません");
  process.exit(1);
}

// level 1: 大分類
const majors = childDirs(ROOT);
checkSiblings(majors, ROOT);
for (const majorName of majors) {
  if (!DIR_NAME_RE.test(majorName)) continue;
  const majorAbs = path.join(ROOT, majorName);
  requireFrontmatterTitle(path.join(majorAbs, "_category.md"));
  if (fs.existsSync(path.join(majorAbs, "index.md"))) {
    errors.push(`${rel(majorAbs)}: 大分類に index.md は置けません（カテゴリを挟む）`);
  }

  // level 2: カテゴリ
  const categories = childDirs(majorAbs);
  if (categories.length === 0) errors.push(`${rel(majorAbs)}: カテゴリがありません`);
  checkSiblings(categories, majorAbs);
  for (const catName of categories) {
    if (!DIR_NAME_RE.test(catName)) continue;
    const catAbs = path.join(majorAbs, catName);
    requireFrontmatterTitle(path.join(catAbs, "_category.md"));
    if (fs.existsSync(path.join(catAbs, "index.md"))) {
      errors.push(`${rel(catAbs)}: カテゴリに index.md は置けません（個別手順を挟む）`);
    }

    // level 3: 個別手順
    const procedures = childDirs(catAbs);
    if (procedures.length === 0) errors.push(`${rel(catAbs)}: 個別手順がありません`);
    checkSiblings(procedures, catAbs);
    for (const procName of procedures) {
      if (!DIR_NAME_RE.test(procName)) continue;
      const procAbs = path.join(catAbs, procName);
      const parsed = requireFrontmatterTitle(path.join(procAbs, "index.md"));
      if (parsed) checkReferencedImages(procAbs, parsed.content);

      // 4 階層目は images/ のみ許可
      for (const extra of childDirs(procAbs)) {
        if (extra !== "images") {
          errors.push(`${rel(path.join(procAbs, extra))}: 個別手順の下は images/ のみ許可`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`procedures/ の検証に失敗しました（${errors.length} 件）:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`procedures/ 検証 OK（大分類 ${majors.length}）`);
