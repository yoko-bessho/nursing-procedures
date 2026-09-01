# 看護手順アプリ（nursing-procedures）

看護手順書を Markdown で書き、静的サイトとして配信するためのアプリ。

> **これはポートフォリオ用の公開版です。** 収録されている手順データはすべて架空で、
> 実在の医療機関・患者・院内規程とは一切関係ありません。実際の看護・医療行為の
> 根拠として使用しないでください。

## デモ

GitHub Pages で配信予定。URL は `https://<GitHubユーザー名>.github.io/nursing-procedures/`
（デプロイ設定後に確定）。

## 設計方針

- **文書の実体は `procedures/` 配下の Markdown ファイルであり、これを唯一の正とする。**
  手順の追加・修正は Markdown を編集して行い、アプリ側にコンテンツを持たない。
- **Git で版管理する。** 誰が・いつ・何を変えたかを履歴として残し、レビューを経て
  反映する。
- **Next.js で静的サイトとして書き出す。** ビルド成果物は HTML/CSS/JS のみで実行時
  サーバーを必要としない。GitHub Pages のような静的ホスティングにも、院内サーバー
  （Nginx 等）にもそのまま配信できる。

## コンテンツ構造（`procedures/`）

手順は「大分類 → カテゴリ → 個別手順」の 3 階層で、各階層をディレクトリで表す。

```
procedures/
└── 10-endoscopy/                 大分類    … _category.md（表示名などのメタ）
    └── 10-upper/                 カテゴリ  … _category.md
        └── 10-egd-assist/        個別手順
            ├── index.md          本文 + frontmatter
            └── images/           この手順専用の画像（本文から相対パスで参照）
```

- **ディレクトリ名は `NN-<code>` 形式**。`NN` は 2 桁以上の数字で **10 刻み**（`10-`, `20-`, …）。
  後から間に項目を挿し込めるよう間隔を空けている。`code` は URL に出る短い英小文字スラッグ。
- **並び順は数字プレフィックスの数値順**（辞書順ではない）。`frontmatter` に順序は持たせない。
- **URL は数字プレフィックスを除いたスラッグ**。例: `10-endoscopy/10-upper/10-egd-assist`
  → `/procedures/endoscopy/upper/egd-assist`。並べ替えても URL が変わらない。
- **表示名などの日本語は frontmatter に置く**（ディレクトリ名を日本語にしない）。URL の
  パーセントエンコードと、macOS↔Linux 間の Unicode 正規化ずれを避けるため。
- 階層はちょうど 3 段。中間 2 段は `_category.md`（`title` 必須、`description` 任意）、
  末端は `index.md`（`title` 必須、`summary` / `tags` / `updated` 任意）。
- `procedures/` の規約は `scripts/validate-procedures.mjs` が `npm run build` の前に検査する。

## 技術スタック

- Next.js 16（App Router、静的エクスポート `output: 'export'`）
- React 19
- Tailwind CSS v4（CSS ファースト設定、`tailwind.config.*` なし）
- TypeScript（strict）
- 配信: GitHub Pages + GitHub Actions

## ローカル開発

```bash
npm install
npm run dev      # http://localhost:3000
```

その他のコマンド:

```bash
npm run build              # procedures/ を検証・画像コピー後に静的エクスポート（out/ を生成）
npm run validate:procedures # procedures/ の規約チェックのみ
npm run lint               # ESLint
```

## ステータス

手順コンテンツの構造・命名規約と、それを読む層（`lib/procedures.ts`）、一覧・カテゴリ・
個別手順のルート（`app/procedures/`）まで実装済み。内視鏡・処置・検査を題材にした架空の
サンプルを収録している。未着手: 検索・タグ横断、GitHub Actions でのデプロイ。
