# GitHub から院内 Git（Gitea / GitLab 等）へ移すときの差分メモ

アプリ本体（Next.js・`procedures/`・`scripts/`）は Git サーバーに依存しない。移行で変わるのは
CI 定義、デプロイ、ブランチ保護の設定だけに収める。

## 運用方針（前提）

- GitHub（と GitHub Actions）は**開発・検証段階だけ**で使う。データは架空。
- 実運用では**院内 Git を唯一の正本**とし、文書の作成・編集・承認・履歴管理を院内で完結させる。
- 検証とビルドは院内 Git の CI で行い、院内 Web サーバーへデプロイする。
- **GitHub から院内 Git への定期同期は行わない。** 切り替えは一度きりで、その後に GitHub を更新しても院内へは反映されない。

この方針から、次のことが決まる。

- 院内 CI は外部ネットワークへの通信を前提にしない（ネットワーク遮断の程度は未確定のため、外部通信は
  最小にして一覧化する。下記「外部通信の一覧」）。
- GitHub 側の CI（`npm run ci:github`）と院内側の CI（`npm run ci`）は別物として扱う。

### 未決事項

| 項目 | 内容 |
|---|---|
| 外部遮断の程度 | 完全な遮断か、一部の経路があるか。npm ミラーを立てられるかも含めて未確定 |
| 切り替え時に持ち込むもの | コード・設定・docs を、履歴ごと持ち込むか、スナップショットだけにするか。実運用の手順データは院内で新規に作成する（GitHub の架空データは持ち込まない）かどうか |
| 依存と脆弱性の更新経路 | 同期をしないため、`audit:prod` の結果を自動で受け取れない。院内で依存を更新する手順（例: 外部につながる環境で更新・検査したものを、院内の定められた手順で持ち込む）を、院内のセキュリティ方針に沿って決める必要がある |

## 変わらないもの

- `procedures/` の規約と `scripts/validate-procedures.mjs`
- `npm run ci`（validate → check:patient-info → lint → build）。院内 CI のロジックはここにある。GitHub 側は `npm run ci:github`（`audit:prod` + `npm run ci`）
- 静的エクスポート（`output: "export"`）。成果物は HTML/CSS/JS のみ

## 変わるもの

| 項目 | GitHub（テスト） | 院内 Git |
|---|---|---|
| CI 定義 | `.github/workflows/ci.yml`（`npm run ci:github`） | Gitea Actions（`.gitea/workflows/`）または GitLab CI（`.gitlab-ci.yml`）に書き写す |
| デプロイ | `deploy-pages.yml`（GitHub Pages） | 院内 Web サーバーへの配置。**作らない（Phase 1 の対象外）。** 認証方式も未決定 |
| ブランチ保護 | GitHub の設定 | [branch-protection.md](branch-protection.md) の対応表で再設定 |
| PR テンプレート | `.github/pull_request_template.md` | Gitea は `.gitea/pull_request_template.md`、GitLab は `.gitlab/merge_request_templates/` |
| 開発補助 | `claude.yml` | **持ち込まない** |

## CI の書き写し

`ci.yml` は 4 手順だけで、置き換えは機械的にできる。

1. Node.js 22 系を用意する
2. `npm ci`
3. `npm run ci`（`ci:github` ではなく `ci`。`audit:prod` は含めない）
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

## 外部通信の一覧

院内 CI が外部ネットワークに出られない場合に備え、`npm run ci` とワークフローが通信する箇所を洗い出した。
**公開後のサイトは外部に通信しない**（ビルド後の HTML に外部ホストへの参照はなく、フォントも
ビルド時に自前の配信物へ取り込まれる。検索も同じサイト内の `search-index.json` を読むだけ）。

### ビルド・検証（`npm run ci`）

| # | 処理 | 通信先 | 院内 CI での扱い |
|---|---|---|---|
| 1 | `npm ci` | npm レジストリ | 院内ミラー（レジストリのプロキシ）を `npm config` で指定する。ネイティブの SWC / sharp などもここで取得される |
| 2 | `npm run audit:prod`（`ci:github` のみ） | npm レジストリの監査 API | **院内の `npm run ci` には含めていないため、院内 CI では通信しない。** 下記「依存の脆弱性検査」を参照 |
| 3 | `next build` のフォント取得 | なし（対応済み） | `app/layout.tsx` は `next/font/local` で `app/fonts/` の Geist（latin のみ、OFL）を読む。以前の `next/font/google` はビルド時に Google Fonts へ通信していたが、通信しなくなった。フォントを差し替えるときは `app/fonts/OFL.txt` のライセンスも確認する |
| 4 | `next build` のテレメトリ | Next.js の収集先 | 匿名の情報で、現状は有効。院内 CI では `NEXT_TELEMETRY_DISABLED=1` を環境変数に設定するか、`next telemetry disable` を実行する |

通信しない処理: `validate:procedures`、`check:patient-info`、`test:patient-info`、`lint`、画像コピー
（`copy-procedure-assets.mjs`）。いずれもローカルのファイルだけを読む。

### ワークフロー（GitHub 固有）

| 処理 | 通信先 | 院内 CI での扱い |
|---|---|---|
| `actions/checkout`、`actions/setup-node`、`actions/upload-artifact` | GitHub（Action の取得、成果物のアップロード）。`setup-node` は Node.js の配布元にも通信する | Gitea Actions では Action の取得元の設定が必要。GitLab CI では不要（イメージで Node を用意する） |
| `actions/upload-pages-artifact`、`actions/deploy-pages` | GitHub Pages | 移行先では使えない。削除する |

### 未検証の点

- フォントを `next/font/local` に切り替えた `next build` は、外部通信を遮断した環境（macOS の `sandbox-exec`）で通ることを
  確認した（切り替え前は同じ条件で失敗した）。一方、遮断下での `npm run ci` 全体（テレメトリを含む）と、
  院内 CI 上での実行は未確認。移行時に、ネットワークを遮断した環境で実行して、通信の見落としがないか確認すること。
- 手順: 依存を取得済みの状態で外部通信を遮断し、`npm run ci` が通るか、通信エラーがどの処理で出るかを見る。

## 依存の脆弱性検査（audit:prod）

`npm run ci:github` は `npm audit --omit=dev --audit-level=high` を実行し、本番依存に high 以上の脆弱性が
あれば失敗する。**npm のレジストリに通信する**（上記「外部通信の一覧」の 2）ため、外部通信のない院内 CI の
`npm run ci` には含めていない。

- GitHub 側（開発・検証段階）では、依存の脆弱性を CI で検知する。
- 院内側では、この検査は自動では動かない。同期もしないため、依存の更新経路は「未決事項」で決める。
- 院内に監査 API を中継できるミラーがあれば、`npm run audit:prod` を院内 CI に**追加**してもよい（任意）。

開発依存（lint 用など）は成果物に入らないため対象外にしている。

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

- [ ] 院内 Git の CI で `npm run ci` が通る（`ci:github` ではない）
- [ ] 外部通信の一覧（npm・Google Fonts・テレメトリ）の扱いを決め、ネットワーク遮断下でも `npm run ci` が通る
- [ ] 「未決事項」（外部遮断の程度・切り替え時に持ち込むもの・依存と脆弱性の更新経路）を決めた
- [ ] ブランチ保護の 5 項目を設定し、PR 経由でしか `main` に入らないことを確認した
- [ ] 必須チェック名（`verify`）をそろえた
- [ ] 履歴・PR・Artifact に患者情報が含まれていない
- [ ] `claude.yml` と関連シークレットを持ち込んでいない
