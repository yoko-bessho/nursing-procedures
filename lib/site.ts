// 配信先によってサブパス配信（GitHub Pages のプロジェクトサイトは /<リポジトリ名>/）か
// ルート配信（院内 Web サーバーなど）かが変わる。basePath を 1 か所で持ち、next.config.ts
// （ビルド設定）と Markdown 内画像の絶対パス組み立ての双方から参照して、両者がずれないようにする。
//
// 配信先ごとの違いはビルド時の環境変数 NEXT_PUBLIC_BASE_PATH だけで吸収し、コードは書き換えない。
// 既定はルート配信（""）。Pages 用ビルドは deploy-pages.yml が "/nursing-procedures" を渡す。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 手順コンテンツの画像を配信するルート。copy-procedure-assets.mjs のコピー先とそろえる。
export const PROCEDURE_ASSETS_PREFIX = "procedures-assets";
