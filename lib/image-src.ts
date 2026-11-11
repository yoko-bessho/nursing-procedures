import { BASE_PATH, PROCEDURE_ASSETS_PREFIX } from "./site";

// lib/procedures.ts は node:fs を使うため Client Component から読み込めない。申請アプリの
// プレビューでも本文の描画（procedure-markdown.tsx）を共有できるよう、ファイル I/O を伴わない
// パス変換だけをここに切り出す。

// Markdown 内の相対画像パス（images/foo.png）を、コピー済みアセットの絶対パスへ変換する。
export function resolveImageSrc(routePath: string, src: string): string {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(src) || src.startsWith("/")) return src;
  const clean = src.replace(/^\.\//, "");
  return `${BASE_PATH}/${PROCEDURE_ASSETS_PREFIX}/${routePath}/${clean}`;
}
