// 検索データを作るサーバー側と、検索するクライアント側の両方から import するため、Node の API に依存させない。

export type SearchDocument = {
  // routePath（例: "endoscopy/upper/egd-assist"）。リンク先は `/procedures/${id}`。
  id: string;
  title: string;
  majorTitle: string;
  categoryTitle: string;
  summary: string;
  tags: string[];
  body: string;
};

// app/search-index.json/ のフォルダ名とそろえる。basePath はデプロイ先に依存させないよう含めず、fetch 側で前置する。
export const SEARCH_INDEX_PATH = "/search-index.json";

// 日本語は空白で単語が区切れず MiniSearch 既定の分割では引けないため、2 文字ずつ（bigram）に分けて部分一致を拾う。
// 形態素解析は辞書が重く医療用語も誤分割しやすい。先に文字・数字以外で区切るのは、記号をまたぐ無意味な組を作らないため。
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const part of text.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    // サロゲートペアの漢字を途中で切らないよう、UTF-16 単位ではなく文字単位で扱う。
    const chars = Array.from(part);
    if (chars.length === 1) tokens.push(part);
    for (let i = 0; i < chars.length - 1; i++) tokens.push(chars[i] + chars[i + 1]);
  }
  return tokens;
}
