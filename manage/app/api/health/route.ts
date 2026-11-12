// basePath 配下（/manage/api/…）で Route Handler が動くことを確かめるための最小の API。
export async function GET() {
  return Response.json({ ok: true });
}
