# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## フレームワークに関する注意 — フレームワークのコードを書く前に読むこと

`AGENTS.md`（上記でインポート）は `next dev` によって再生成されるファイルで、この
Next.js **16.3.3** が古い知識と比べて破壊的変更を含むことを警告している。ルーティング・
レンダリング・設定・キャッシュ・データ取得のコードを書く前に、リポジトリに同梱された
バージョン一致のドキュメント `node_modules/next/dist/docs/` を参照すること（App Router は
`01-app/`、コンパイラや Fast Refresh の挙動は `03-architecture/`）。記憶している Next.js の
API に頼らないこと。

`npm run dev` を実行すると `AGENTS.md` 内の agent-rules ブロックが書き換えられる。元に
戻しても再生成されるだけなので、変更は作業内容と一緒にコミットすること。

## コマンド

- `npm run dev` — 開発サーバー（http://localhost:3000）
- `npm run build` — 本番ビルド
- `npm run start` — 本番ビルドの配信
- `npm run lint` — ESLint（フラット設定: `eslint-config-next` の core-web-vitals + TypeScript）

テストランナーは設定されていない。

## アーキテクチャ

新規プロジェクト。目指すプロダクトは看護手順アプリだが、ドメインのコード・データ層・
追加ルートはまだ存在しない。現状はアプリの骨組みと、静的エクスポート／GitHub Pages
配信の設定（`next.config.ts`）のみ。

この節には「コードを書くうえで知っておくべき配線と規約」だけを書く。プロダクトの目的・
設計方針は `README.md`、依存パッケージの正確なバージョンは `package.json` を正とし、
ここでは重複させない。

- **ルーター:** App Router のみ。ルート・レイアウト・メタデータの export はすべて `app/`
  配下に置く。`app/layout.tsx` がルートレイアウトで、`next/font/google` 経由で Geist
  フォントを読み込み、`<html>`/`<body>` を描画する。
- **生成される props 型:** ページ/レイアウトコンポーネントは、手書きの props
  インターフェースではなくフレームワークが生成するグローバル型（`LayoutProps<"/">`、
  `PageProps<...>` など。`.next/types/routes.d.ts` で宣言され `next-env.d.ts` 経由で
  読み込まれる）で型付けする。ルートは静的に型付けされ、リンクやパラメータが実際の
  ルートツリーに対して検査される。
- **スタイリング:** CSS ファースト設定の Tailwind。`tailwind.config.*` は存在しない。
  `app/globals.css` で `@import "tailwindcss"` を行い、`@theme inline` ブロックで CSS
  変数に紐づくデザイントークンを定義する。ダークモードは `prefers-color-scheme` メディア
  クエリで変数を切り替える。PostCSS は `@tailwindcss/postcss` を実行する。
- **TypeScript:** `strict` 前提でコードを書く。`moduleResolution: bundler`、`@/*` は
  リポジトリルートに解決される（`tsconfig.json` の `paths` を参照）。

## コンテンツ（`procedures/`）— 手順を触る前に読むこと

手順の実体は `procedures/` の Markdown。App 側にコンテンツを持たせない。構造の全体像は
`README.md` の「コンテンツ構造」を正とする。ここでは実装上の要点だけ。

- **3 階層固定**: `大分類/カテゴリ/個別手順`。ディレクトリ名は `^\d{2,}-[a-z0-9-]+$`
  （2 桁以上の数字プレフィックス + 小文字コード）。プレフィックスは **10 刻み**運用。
- **並び順は先頭整数の数値順**。辞書順にしない（`100-` が `20-` より後に来るように）。
- **URL セグメント = ディレクトリ名から `^\d+-` を除いたもの**。番号を変えても URL は不変。
- 中間 2 段は `_category.md`（`title` 必須）、末端は `index.md`（`title` 必須、
  `summary`/`tags`/`updated` 任意）。日本語表示名は必ず frontmatter に置き、ディレクトリ名は
  ASCII に保つ。
- 読み込みは `lib/procedures.ts` に集約（`getProcedureTree` / `getAllProcedureParams` /
  `getProcedure` / `resolveImageSrc`）。ルートは `app/procedures/` の 4 枚。
- 規約の強制は `scripts/validate-procedures.mjs`（`prebuild` で実行）。ローダーは正データ前提で
  書き、チェックはバリデータ側に足す。
- 手順画像は各 `index.md` 隣の `images/` に co-locate。`scripts/copy-procedure-assets.mjs` が
  `public/procedures-assets/<route-path>/images/` へミラーする（`prebuild`、生成物なので gitignore）。
  本文からは相対パス `images/foo.png` で参照し、`resolveImageSrc` が絶対パスへ変換する。

## デプロイと静的エクスポートの制約 — サーバー機能を使う前に読むこと

このリポジトリはポートフォリオ用の架空データ版で、GitHub Pages に配信する。配信は
静的ホスティングのみで Node.js サーバーは存在しない。`next.config.ts` で
`output: "export"` に固定してあるので、これを壊す機能は使わない。

`output: "export"` の制約は必ず
`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`（バージョン一致
ドキュメント）を正とする。以下の一覧は代表例であり、最終判断はそのドキュメントに従う。

- 使えない例: Server Actions、Request に依存する Route Handler、`cookies()`、
  `rewrites` / `redirects` / `headers`、ISR、middleware / proxy、
  `generateStaticParams()` のない動的ルート、`dynamicParams: true`、Intercepting Routes、
  Draft Mode、`next/image` のデフォルトローダー。
- 手順ページなどの動的ルートは `generateStaticParams()` で全件を静的に列挙する。
- 画像は `images.unoptimized: true` を設定済み（`next/image` のデフォルト最適化は不可）。
- GitHub Pages のプロジェクトサイトはサブパス配信（`/<リポジトリ名>/`）になる。`basePath` は
  `lib/site.ts` の `BASE_PATH`（環境変数 `NEXT_PUBLIC_BASE_PATH`、既定は空）で一元管理し、
  `next.config.ts` と画像パス組み立ての両方がここを参照する。ルート絶対パスを組むときは
  `BASE_PATH` を前置する。
- `window` / `localStorage` などブラウザ API は `next build` 時に存在しないので、
  Client Component 内の `useEffect` など「ブラウザでのみ実行される箇所」で触る。

## 規約

- コミットメッセージは日本語で書く。
- コードのコメントは、そのコードを選択した理由を日本語で書く（何をしているかではなく、なぜそうしたかを書く）

