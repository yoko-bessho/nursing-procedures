# GitHub から院内 Git（Gitea / GitLab 等）へ移すときの差分メモ

アプリ本体（Next.js・`procedures/`・`scripts/`）は Git サーバーに依存しない。移行で変わるのは
CI 定義、デプロイ、ブランチ保護の設定だけに収める。

## 変わらないもの

- `procedures/` の規約と `scripts/validate-procedures.mjs`
- `npm run ci`（validate → check:patient-info → lint → build）。CI のロジックはここにある
- 静的エクスポート（`output: "export"`）。成果物は HTML/CSS/JS のみ

## 変わるもの

| 項目 | GitHub（テスト） | 院内 Git |
|---|---|---|
| CI 定義 | `.github/workflows/ci.yml` | Gitea Actions（`.gitea/workflows/`）または GitLab CI（`.gitlab-ci.yml`）に書き写す |
| デプロイ | `deploy-pages.yml`（GitHub Pages） | 院内 Web サーバーへの配置。**作らない（Phase 1 の対象外）。** 認証方式も未決定 |
| ブランチ保護 | GitHub の設定 | [branch-protection.md](branch-protection.md) の対応表で再設定 |
| PR テンプレート | `.github/pull_request_template.md` | Gitea は `.gitea/pull_request_template.md`、GitLab は `.gitlab/merge_request_templates/` |
| 開発補助 | `claude.yml` | **持ち込まない** |

## CI の書き写し

`ci.yml` は 4 手順だけで、置き換えは機械的にできる。

1. Node.js 22 系を用意する
2. `npm ci`
3. `npm run ci`
4. `out/` を成果物として保存する（任意）

GitLab CI は `image: node:22` と `script:` に同じコマンドを並べ、`artifacts: paths: [out/]` で保存する。

使っている外部 Action（すべて公式、SHA 固定）と移行時の扱い:

| Action | 使用箇所 | 移行時 |
|---|---|---|
| `actions/checkout` | ci / deploy-pages | Gitea Actions では利用可。GitLab CI では不要 |
| `actions/setup-node` | ci / deploy-pages | Gitea Actions では利用可。GitLab CI ではイメージで代替 |
| `actions/upload-artifact` | ci | Gitea の版によっては v4 以降が動かない。動かなければ版を下げるか、保存を省略する |
| `actions/upload-pages-artifact`, `actions/deploy-pages` | deploy-pages | **GitHub Pages 専用。移行先では使えないので削除する** |

`ci.yml` が GitHub 固有の機能に依存するのは `concurrency` の `github.ref` のみ。移行先で
解釈できなければこの設定は削除してよい（動作には影響しない）。

## BASE_PATH とサーバー設定

- BASE_PATH はビルド時に決まる（`NEXT_PUBLIC_BASE_PATH`、既定は空）。院内 Web サーバーを
  ルート（`/`）で配信するなら設定不要。サブパス配信にするなら、そのパスでビルドし直す。
- 静的エクスポートは `/procedures/endoscopy.html` のような `.html` を出力する。Nginx では
  拡張子なしの URL を解決させる設定が必要（例: `try_files $uri $uri.html $uri/ =404;`）。
  詳細は `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`。

## 認証・権限

- `deploy-pages.yml` の `id-token: write` は GitHub Pages の公式デプロイ専用で、移行先では不要。
- 院内の認証基盤が判明するまで、認証方式（OIDC 等）は決めない。独自のログインや承認機能は作らない。

## 移行前チェックリスト

- [ ] 院内 Git で CI を実行し、`npm run ci` が通る
- [ ] ブランチ保護の 5 項目を設定し、PR 経由でしか `main` に入らないことを確認した
- [ ] 必須チェック名（`verify`）をそろえた
- [ ] 履歴・PR・Artifact に患者情報が含まれていない
- [ ] `claude.yml` と関連シークレットを持ち込んでいない
