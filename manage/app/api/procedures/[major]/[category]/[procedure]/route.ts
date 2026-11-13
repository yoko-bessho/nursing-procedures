import { GitProviderError } from "@/manage/lib/git-provider";
import { findProcedurePath, parseProcedure } from "@/manage/lib/procedure-file";
import { gitProvider } from "@/manage/lib/service";

// 編集画面の元データ。閲覧サイトは手動デプロイで main より古いことがあるため、必ず Git の最新から取る
// （古い内容を元に申請すると、他の人がマージした変更を消し戻してしまう）。
export async function GET(_req: Request, ctx: RouteContext<"/api/procedures/[major]/[category]/[procedure]">) {
  const { major, category, procedure } = await ctx.params;
  try {
    const git = gitProvider();
    const commit = await git.getHeadCommit();
    const filePath = findProcedurePath(await git.getTree(commit), major, category, procedure);
    if (!filePath) return Response.json({ error: "手順が見つかりません" }, { status: 404 });

    const file = await git.getFile(filePath, commit);
    if (!file) return Response.json({ error: "手順が見つかりません" }, { status: 404 });

    const parsed = parseProcedure(file.content);
    const pending = await git.listOpenPullRequestsTouching(filePath);
    return Response.json({
      filePath,
      version: file.version,
      ...parsed,
      pendingPullRequests: pending,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

function errorResponse(e: unknown) {
  if (e instanceof GitProviderError) return Response.json({ error: e.message }, { status: 502 });
  return Response.json({ error: e instanceof Error ? e.message : "不明なエラー" }, { status: 500 });
}
