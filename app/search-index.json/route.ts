import { getSearchDocuments } from "@/lib/procedures";

// prebuild スクリプトではなく Route Handler で作るのは、lib/procedures.ts の読み込みを再利用でき、
// next dev でもそのまま動くため。静的エクスポートでは force-static の GET がビルド時に JSON ファイルとして書き出される。
export const dynamic = "force-static";

export async function GET() {
  return Response.json(getSearchDocuments());
}
