import { runChecks } from "@/manage/lib/checks";
import { GitProviderError } from "@/manage/lib/git-provider";
import { buildPullRequest, formatRequestedAt, LIMITS, stripControl } from "@/manage/lib/pr-body";
import {
  findProcedurePath,
  parseProcedure,
  serializeProcedure,
  todayInTokyo,
} from "@/manage/lib/procedure-file";
import { currentUser, rejectUntrustedRequest } from "@/manage/lib/request-guard";
import { gitProvider } from "@/manage/lib/service";

type ChangeRequestInput = {
  major: string;
  category: string;
  procedure: string;
  version: string;
  title: string;
  summary: string;
  tags: string[];
  body: string;
  requester: string;
  reason: string;
  changeNote: string;
  prTitle: string;
};

// 修正申請: 検査 → ブランチ作成 → 取得時のバージョンを指定してファイル更新 → PR 作成。
// 承認とマージは Git 側で行う（このアプリはマージしない）。
export async function POST(request: Request) {
  const rejected = rejectUntrustedRequest(request);
  if (rejected) return rejected;

  const input = parseInput(await request.json().catch(() => null));
  if (typeof input === "string") return Response.json({ error: input }, { status: 400 });

  const user = currentUser(input.requester);
  if (!user) return Response.json({ error: "申請者名を入力してください" }, { status: 400 });

  const git = gitProvider();
  let branch: string | null = null;
  try {
    const head = await git.getHeadCommit();
    const tree = await git.getTree(head);
    const filePath = findProcedurePath(tree, input.major, input.category, input.procedure);
    if (!filePath) return Response.json({ error: "手順が見つかりません" }, { status: 404 });

    // 編集画面を開いた後に main が変わっていたら、古い内容からの申請になるので止めて再取得させる。
    const latest = await git.getFile(filePath, head);
    if (!latest || latest.version !== input.version) {
      return Response.json(
        { error: "編集中にこの手順が更新されました。画面を開き直して最新の内容から修正してください" },
        { status: 409 },
      );
    }

    // updated は申請のたびに書き換わるので、ファイル全体ではなく編集できる項目どうしで比べる。
    const before = parseProcedure(latest.content);
    if (
      before.title === input.title &&
      before.summary === input.summary &&
      before.tags.join("\u0000") === input.tags.join("\u0000") &&
      before.body === input.body
    ) {
      return Response.json({ error: "変更がありません" }, { status: 400 });
    }
    const content = serializeProcedure(
      { title: input.title, summary: input.summary, tags: input.tags, body: input.body },
      todayInTokyo(),
    );

    const pr = buildPullRequest(
      { requester: user.name, reason: input.reason, changeNote: input.changeNote, prTitle: input.prTitle },
      { filePath, procedureTitle: input.title, baseVersion: input.version, requestedAt: formatRequestedAt() },
    );

    // PR 本文のうちアプリが機械的に書く部分（申請日時など）は検査しても誤検知になるだけなので、
    // 申請者が入力した文面だけを患者情報チェックにかける。
    const checks = await runChecks({
      tree,
      filePath,
      content,
      pullRequestText: [pr.title, user.name, input.reason, input.changeNote].join("\n\n"),
    });
    if (!checks.ok) {
      return Response.json({ error: "検査で問題が見つかりました", messages: checks.messages }, { status: 422 });
    }

    branch = branchName(input.procedure);
    await git.createBranch(branch, head);
    await git.putFile({
      branch,
      path: filePath,
      content,
      version: input.version,
      message: `${input.title} を修正（申請者: ${user.name}・未認証）`,
    });
    const created = await git.createPullRequest({ head: branch, title: pr.title, body: pr.body });
    branch = null;
    return Response.json({ pullRequest: created, warnings: checks.messages }, { status: 201 });
  } catch (e) {
    // PR まで作れなかったブランチは残しても誰も片付けないので消す。消せなくても元のエラーを返す。
    if (branch) await git.deleteBranch(branch).catch(() => {});
    if (e instanceof GitProviderError) return Response.json({ error: e.message }, { status: 502 });
    return Response.json({ error: e instanceof Error ? e.message : "不明なエラー" }, { status: 500 });
  }
}

// 同じ手順への申請が重なってもブランチ名がぶつからないよう、時刻を付ける。
function branchName(procedure: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `request/${procedure}-${stamp}`;
}

const SLUG_RE = /^[a-z0-9-]+$/;

// ブラウザからの入力は信用しない。型・長さ・形式をここで確かめ、制御文字を除いて返す。
function parseInput(raw: unknown): ChangeRequestInput | string {
  if (!raw || typeof raw !== "object") return "入力が不正です";
  const r = raw as Record<string, unknown>;
  const str = (key: string, max: number, required = false): string | null => {
    const v = r[key];
    if (typeof v !== "string") return required ? null : "";
    const s = stripControl(v);
    if (s.length > max) return null;
    if (required && s.trim() === "") return null;
    return s;
  };

  for (const key of ["major", "category", "procedure"]) {
    if (typeof r[key] !== "string" || !SLUG_RE.test(r[key] as string)) return "手順の指定が不正です";
  }
  if (typeof r.version !== "string" || !/^[0-9a-f]{7,64}$/.test(r.version)) return "バージョンの指定が不正です";
  if (!Array.isArray(r.tags) || r.tags.length > LIMITS.tags) return `タグは ${LIMITS.tags} 個までです`;
  const tags = r.tags.map((t) => (typeof t === "string" ? stripControl(t).trim() : ""));
  if (tags.some((t) => t === "" || t.length > LIMITS.tag)) return `タグは 1〜${LIMITS.tag} 文字にしてください`;

  const fields = {
    title: str("title", LIMITS.title, true),
    summary: str("summary", LIMITS.summary),
    body: str("body", LIMITS.body, true),
    requester: str("requester", LIMITS.requester, true),
    reason: str("reason", LIMITS.reason, true),
    changeNote: str("changeNote", LIMITS.changeNote),
    prTitle: str("prTitle", LIMITS.prTitle),
  };
  const labels: Record<string, string> = {
    title: "タイトル",
    summary: "概要",
    body: "本文",
    requester: "申請者名",
    reason: "修正理由",
    changeNote: "変更内容の説明",
    prTitle: "PR タイトル",
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) return `${labels[key]}が未入力か、長すぎます`;
  }
  // タイトルや概要は frontmatter の 1 行に入るため、改行は空白にそろえる。
  const oneLine = (s: string) => s.replace(/\s*[\r\n]+\s*/g, " ").trim();
  return {
    major: r.major as string,
    category: r.category as string,
    procedure: r.procedure as string,
    version: r.version,
    tags,
    title: oneLine(fields.title!),
    summary: oneLine(fields.summary!),
    body: fields.body!.replace(/\r\n/g, "\n"),
    requester: oneLine(fields.requester!),
    reason: fields.reason!,
    changeNote: fields.changeNote!,
    prTitle: oneLine(fields.prTitle!),
  };
}
