import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { repoRoot } from "./config";
import type { TreeEntry } from "./git-provider";

const run = promisify(execFile);

export type CheckResult = {
  ok: boolean;
  // 利用者にそのまま見せる検査結果の行（FAIL / WARN / 規約違反）。
  messages: string[];
};

// 規約・患者情報の検査は CI と同じスクリプトを呼ぶ。PHP や TS に移植すると決まりが二重になり、
// いずれずれるため。スクリプトはファイルシステムを読むので、一時ディレクトリに検査対象を並べる。
export async function runChecks(args: {
  tree: TreeEntry[];
  filePath: string;
  content: string;
  pullRequestText: string;
}): Promise<CheckResult> {
  const root = repoRoot();
  // macOS の一時ディレクトリは /var → /private/var のシンボリックリンクで、スクリプトが表示する相対パスが
  // ずれる。実体のパスにそろえておく。
  const tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "manage-check-")));
  try {
    await layoutTree(tmp, args);
    const messages: string[] = [];
    let ok = true;

    const validate = await runNode(root, tmp, ["scripts/validate-procedures.mjs"]);
    if (validate.code !== 0) {
      ok = false;
      messages.push(...validate.stderr.split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.trim().slice(2)));
    }

    // 患者情報チェックは手順本文と PR の文面（タイトル・本文・修正理由）の両方を見る。PR の文面も
    // Git サーバー側に残るため、作成前に止める。除外設定は本番と同じファイルを使う。
    const patient = await runNode(root, tmp, [
      "scripts/check-patient-info.mjs",
      "--root",
      tmp,
      "--allowlist",
      path.join(root, "scripts", "patient-info-allowlist.json"),
    ]);
    if (patient.code !== 0) ok = false;
    messages.push(...summarizePatientInfo(patient.stdout + patient.stderr));

    return { ok, messages };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

// validate-procedures.mjs は procedures/ 全体を検査する。変更していないファイルは main で CI を通っており、
// PR でも CI が全体を検査し直すので、ここでは変更した手順とその親だけを置く（親の _category.md は
// 中身を取りに行かず、title だけの代用品にする）。本文が参照する画像は、存在だけを再現する。
async function layoutTree(
  tmp: string,
  args: { tree: TreeEntry[]; filePath: string; content: string; pullRequestText: string },
) {
  const procDir = path.posix.dirname(args.filePath);
  const catDir = path.posix.dirname(procDir);
  const majorDir = path.posix.dirname(catDir);
  for (const dir of [majorDir, catDir]) {
    await fs.mkdir(path.join(tmp, dir), { recursive: true });
    await fs.writeFile(path.join(tmp, dir, "_category.md"), "---\ntitle: 検査用の代用品\n---\n");
  }
  await fs.mkdir(path.join(tmp, procDir), { recursive: true });
  await fs.writeFile(path.join(tmp, args.filePath), args.content);
  for (const e of args.tree) {
    if (e.type === "blob" && e.path.startsWith(`${procDir}/images/`)) {
      await fs.mkdir(path.join(tmp, path.posix.dirname(e.path)), { recursive: true });
      await fs.writeFile(path.join(tmp, e.path), "");
    }
  }
  await fs.mkdir(path.join(tmp, "_pull-request"), { recursive: true });
  await fs.writeFile(path.join(tmp, "_pull-request", "text.md"), args.pullRequestText);
}

async function runNode(scriptRoot: string, cwd: string, argv: string[]) {
  const [script, ...rest] = argv;
  try {
    const { stdout, stderr } = await run(process.execPath, [path.join(scriptRoot, script), ...rest], { cwd });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof err.code === "number" ? err.code : 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

function summarizePatientInfo(output: string): string[] {
  const lines = output.split("\n");
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (/^(FAIL|WARN) \[/.test(line)) {
      const where = line.replace("_pull-request/text.md", "申請の文面（PR タイトル・申請者名・修正理由・変更内容の説明）");
      out.push(`${where}\n${(lines[i + 1] ?? "").trim()}`);
    } else if (line.startsWith("除外設定が不正です") || line.startsWith("検査対象がありません")) {
      out.push(line);
    }
  });
  return out;
}
