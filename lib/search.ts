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

const EXCERPT_BEFORE = 10;
const EXCERPT_AFTER = 20;

export type Excerpt = { before: string; hit: string; after: string };

// 検索語が本文に最初に現れる位置の前後を、その行の中だけで切り出す。行をまたぐと見出しと本文の
// ように別の文がつながって読みにくいため。本文に語がそのまま無い（タイトルやタグだけで一致した等）ときは null。
export function makeExcerpt(text: string, query: string): Excerpt | null {
  const words = query.normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length === 0) return null;

  // 語は文字・数字だけなのでエスケープ不要。同じ位置では長い語を優先させるため長い順に並べる。
  const pattern = new RegExp(words.sort((a, b) => b.length - a.length).join("|"), "iu");
  const { normalized, offsets } = normalizeWithOffsets(text);
  const match = pattern.exec(normalized);
  if (!match) return null;

  const hitStart = offsets[match.index];
  const hitEnd = offsets[match.index + match[0].length];
  const lineStart = text.lastIndexOf("\n", hitStart) + 1;
  const newline = text.indexOf("\n", hitEnd);
  const lineEnd = newline === -1 ? text.length : newline;
  const start = Math.max(lineStart, hitStart - EXCERPT_BEFORE);
  const end = Math.min(lineEnd, hitEnd + EXCERPT_AFTER);

  return {
    before: (start > lineStart ? "…" : "") + text.slice(start, hitStart),
    hit: text.slice(hitStart, hitEnd),
    after: text.slice(hitEnd, end) + (end < lineEnd ? "…" : ""),
  };
}

// 全角・半角の違いを吸収して探しつつ、表示は元の文字（全角括弧など）のまま切り出したいので、
// 1 文字ずつ NFKC 正規化して「正規化後の位置 → 元の位置」の対応表を作る。
function normalizeWithOffsets(text: string): { normalized: string; offsets: number[] } {
  let normalized = "";
  const offsets: number[] = [];
  let index = 0;
  for (const char of text) {
    const n = char.normalize("NFKC");
    normalized += n;
    for (let i = 0; i < n.length; i++) offsets.push(index);
    index += char.length;
  }
  offsets.push(index);
  return { normalized, offsets };
}
