import { allowedOrigins } from "./config";

// 書き込み系 API の入口で呼ぶ。ブラウザは別サイトからの POST にも Origin を付けるので、許可した
// オリジン以外は拒否する。Content-Type を JSON に限るのは、別サイトのフォーム送信（プリフライトなしで
// 届く形式）を受け付けないため。
export function rejectUntrustedRequest(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) {
    return Response.json({ error: "許可されていない送信元です" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "JSON で送信してください" }, { status: 415 });
  }
  return null;
}

export type CurrentUser = { name: string; authenticated: boolean };

// 「誰が申請したか」の取り出し口を 1 か所にまとめる。認証を入れるときはここをセッションから
// 引く実装に差し替え、未ログインなら null を返して各 Route Handler が 401 にする。
// 今は認証がないため、申請画面で入力された名前を自己申告として扱う。
export function currentUser(selfDeclaredName: string): CurrentUser | null {
  const name = selfDeclaredName.trim();
  return name ? { name, authenticated: false } : null;
}
