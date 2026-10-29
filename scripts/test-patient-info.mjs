// check-patient-info.mjs の期待動作を fixtures で検証する。サンプルは procedures/ の外に置き、
// validate・ビルドに混ざらないようにしている。ルール ID とファイル名を一致させ、どのルールが
// 反応したかまで確認する（終了コードだけだと別ルールの誤反応を見逃すため）。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FIX = "scripts/__fixtures__/patient-info";
const NONE = `${FIX}/allowlist/none.json`; // 存在しないパス = 除外設定なし
let failed = 0;

function run(extra) {
  const r = spawnSync("node", ["scripts/check-patient-info.mjs", ...extra], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${detail}`}`);
}
const files = (d) => fs.readdirSync(path.join(FIX, d)).filter((f) => f.endsWith(".md"));

for (const f of files("ng")) {
  const id = f.replace(/\.md$/, "");
  const r = run(["--root", `${FIX}/ng/${f}`, "--allowlist", NONE]);
  expect(`ng/${f}: 終了コード 1 かつ [${id}] FAIL`, r.code === 1 && r.out.includes(`FAIL [${id}]`), `code=${r.code}\n${r.out}`);
}
for (const f of files("warn")) {
  const id = f.replace(/\.md$/, "");
  const root = `${FIX}/warn/${f}`;
  const r = run(["--root", root, "--allowlist", NONE]);
  expect(`warn/${f}: 終了コード 0 かつ [${id}] WARN`, r.code === 0 && r.out.includes(`WARN [${id}]`), `code=${r.code}\n${r.out}`);
  const s = run(["--strict", "--root", root, "--allowlist", NONE]);
  expect(`warn/${f}: --strict で終了コード 1`, s.code === 1, `code=${s.code}`);
}
for (const f of files("ok")) {
  const r = run(["--root", `${FIX}/ok/${f}`, "--allowlist", NONE]);
  expect(`ok/${f}: 終了コード 0 で検出なし`, r.code === 0 && !/FAIL|WARN/.test(r.out.replace(/警告 0 件/, "")), `code=${r.code}\n${r.out}`);
}

const phone = `${FIX}/ng/phone.md`;
let r = run(["--root", phone, "--allowlist", `${FIX}/allowlist/valid.json`]);
expect("allowlist: ファイル+ルール限定の除外で phone が通る", r.code === 0 && !r.out.includes("FAIL"), r.out);
r = run(["--root", `${FIX}/ng/email.md`, "--allowlist", `${FIX}/allowlist/valid.json`]);
expect("allowlist: 他ファイルには効かない（email は失敗のまま）", r.code === 1, r.out);
r = run(["--root", `${FIX}/ok`, "--allowlist", `${FIX}/allowlist/unused.json`]);
expect("allowlist: 未使用エントリは WARN（終了コード 0）", r.code === 0 && r.out.includes("unused-allowlist"), r.out);
for (const bad of ["bad-wildcard", "bad-rule", "bad-no-reason", "bad-shape"]) {
  r = run(["--root", phone, "--allowlist", `${FIX}/allowlist/${bad}.json`]);
  expect(`allowlist: ${bad}.json は終了コード 2`, r.code === 2, `code=${r.code}\n${r.out}`);
}

r = run([]);
expect("実データ procedures/ 全体: 終了コード 0 かつ警告 0 件", r.code === 0 && r.out.includes("失敗 0 件 / 警告 0 件"), r.out);

console.log(failed === 0 ? "\n全ケース合格" : `\n${failed} 件のケースが不合格`);
process.exit(failed === 0 ? 0 : 1);
