// GitHub Pages のプロジェクトサイトはサブパス（/<リポジトリ名>/）配信になる。basePath を
// 1 か所で持ち、next.config.ts（ビルド設定）と Markdown 内画像の絶対パス組み立ての双方から
// 参照して、両者がずれないようにする。
//
// リポジトリ名が確定するまではルート配信（""）。確定後は環境変数 NEXT_PUBLIC_BASE_PATH に
// "/nursing-procedures" のように設定するか、この既定値を書き換える。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 手順コンテンツの画像を配信するルート。copy-procedure-assets.mjs のコピー先とそろえる。
export const PROCEDURE_ASSETS_PREFIX = "procedures-assets";
