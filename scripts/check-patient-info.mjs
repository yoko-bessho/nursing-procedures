// procedures/ に患者情報らしき文字列が混入していないかを検査する補助チェック。
// 画像内の文字は検出できない。最終確認は PR レビューでの目視であり、これは見落としを減らす
// ための網にすぎない。高確度のパターンは失敗（終了コード 1）、曖昧なものは WARN（終了コード 0、
// --strict なら 1）にして、誤検知でレビューが止まり続けないようにする。
//
// 使い方: node scripts/check-patient-info.mjs [--strict] [--root <dir|file>] [--allowlist <file>]
// 終了コード: 0 = 問題なし / 1 = 検出あり / 2 = 除外設定が不正
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const optionValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const ROOT = path.resolve(optionValue("--root", "procedures"));
const ALLOWLIST_PATH = path.resolve(
  optionValue("--allowlist", "scripts/patient-info-allowlist.json"),
);

const DATE = String.raw`(?<!\d)(?:19|20)\d{2}[-/.年]\s?\d{1,2}[-/.月]\s?\d{1,2}日?(?!\d)`;
const BIRTH_WORDS = /生年月日|誕生日|生まれ|生れ|DOB|Birth|Born/i;
const FRONTMATTER_UPDATED = /^updated:\s*\S+\s*$/;

// level: fail = 高確度、warn = 曖昧。test は 1 行を受け取り、該当すれば true。
const RULES = [
  {
    id: "phone",
    level: "fail",
    desc: "電話番号の形式",
    test: (l) =>
      /(?<!\d)0\d{1,4}-\d{1,4}-\d{3,4}(?!\d)/.test(l) || /(?<!\d)0[789]0\d{8}(?!\d)/.test(l),
  },
  {
    id: "birthdate-context",
    level: "fail",
    desc: "生年月日らしい語と日付が同じ行にある",
    test: (l) => BIRTH_WORDS.test(l) && new RegExp(DATE).test(l),
  },
  {
    id: "wareki-date",
    level: "fail",
    desc: "和暦の年月日",
    test: (l) => /(?:明治|大正|昭和|平成|令和)\s?\d{1,2}年\s?\d{1,2}月\s?\d{1,2}日/.test(l),
  },
  {
    id: "long-digits",
    level: "fail",
    desc: "10 桁以上の連続数字",
    test: (l, hits) => !hits.has("phone") && /\d{10,}/.test(l),
  },
  {
    id: "email",
    level: "fail",
    desc: "メールアドレス",
    test: (l) => /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(l),
  },
  {
    id: "digits-7-9",
    level: "warn",
    desc: "7〜9 桁の連続数字（ID の可能性）",
    test: (l) => /(?<![\d.,])\d{7,9}(?![\d.,])/.test(l),
  },
  {
    id: "patient-id-context",
    level: "warn",
    desc: "患者 ID・カルテ番号らしい語の直後の数字",
    test: (l) => /(患者\s?ID|患者番号|カルテ番号|MRN|ID)\s*[:：#]?\s*\d{4,}/i.test(l),
  },
  {
    id: "bare-date",
    level: "warn",
    desc: "文脈のない日付（frontmatter の updated は対象外）",
    test: (l, hits) =>
      !hits.has("birthdate-context") &&
      !hits.has("wareki-date") &&
      !FRONTMATTER_UPDATED.test(l) &&
      new RegExp(DATE).test(l),
  },
];
const RULE_IDS = new Set(RULES.map((r) => r.id));

// 除外設定は「どのファイルの・どのルールを・なぜ」を必ず特定させる。検査全体や特定ルール全体を
// 一括で無効化できる書き方は受け付けない。
function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return [];
  let json;
  try {
    json = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
  } catch (e) {
    fail2(`除外設定を JSON として読めません: ${e.message}`);
  }
  if (!json || !Array.isArray(json.entries)) fail2('除外設定は {"entries": [...]} の形式');
  const allowed = new Set(["file", "rule", "line", "reason"]);
  json.entries.forEach((e, i) => {
    const at = `entries[${i}]`;
    for (const k of Object.keys(e)) if (!allowed.has(k)) fail2(`${at}: 不明なキー ${k}`);
    if (typeof e.file !== "string" || e.file.trim() === "" || /[*?]/.test(e.file))
      fail2(`${at}: file は個別のファイルパス（ワイルドカード不可）`);
    if (!RULE_IDS.has(e.rule)) fail2(`${at}: rule は ${[...RULE_IDS].join(" / ")} のいずれか`);
    if (e.line !== undefined && !Number.isInteger(e.line)) fail2(`${at}: line は整数`);
    if (typeof e.reason !== "string" || e.reason.trim() === "") fail2(`${at}: reason が必須`);
  });
  return json.entries.map((e) => ({ ...e, used: false }));
}

function fail2(msg) {
  console.error(`除外設定が不正です: ${msg}`);
  process.exit(2);
}

function listMarkdown(target) {
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(target, e.name);
    if (e.isDirectory()) return listMarkdown(p);
    return e.name.endsWith(".md") ? [p] : [];
  });
}

if (!fs.existsSync(ROOT)) {
  console.error(`検査対象がありません: ${ROOT}`);
  process.exit(2);
}

const allowlist = loadAllowlist();
const toPosix = (p) => path.relative(process.cwd(), p).split(path.sep).join("/");
const findings = [];

for (const file of listMarkdown(ROOT).sort()) {
  const rel = toPosix(file);
  fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((text, i) => {
      const hits = new Set();
      for (const rule of RULES) {
        if (!rule.test(text, hits)) continue;
        hits.add(rule.id);
        const entry = allowlist.find(
          (a) => a.file === rel && a.rule === rule.id && (a.line === undefined || a.line === i + 1),
        );
        if (entry) {
          entry.used = true;
          continue;
        }
        findings.push({ rel, line: i + 1, rule, text: text.trim().slice(0, 80) });
      }
    });
}

for (const f of findings) {
  const tag = f.rule.level === "fail" ? "FAIL" : "WARN";
  console.log(`${tag} [${f.rule.id}] ${f.rel}:${f.line}  ${f.rule.desc}\n       ${f.text}`);
}
for (const a of allowlist.filter((a) => !a.used)) {
  console.log(`WARN [unused-allowlist] ${a.file} (${a.rule}) に該当する検出がありません。削除してください`);
}

const fails = findings.filter((f) => f.rule.level === "fail").length;
const warns = findings.length - fails;
console.log(`患者情報チェック: 失敗 ${fails} 件 / 警告 ${warns} 件${strict ? "（--strict）" : ""}`);
console.log("注意: 画像内の文字は検出できません。最終確認は PR レビューでの目視です。");
process.exit(fails > 0 || (strict && warns > 0) ? 1 : 0);
