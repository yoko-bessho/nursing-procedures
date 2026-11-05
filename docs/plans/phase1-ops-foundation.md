# Phase 1: 院内Git移植可能な運用基盤（検証CI・患者情報チェック・docs）

## Context
看護手順書（`procedures/` Markdown）を PR レビュー経由で公開する運用の「型」を作る。GitHub でテストしつつ、アプリ本体は GitHub 非依存に保ち、院内 Git（Gitea/GitLab）移行時の変更を CI 定義とデプロイ部分に限定する。既存仕様（命名規則・frontmatter・validate・`output: 'export'`）は変えない。作業ブランチ `feat/ops-foundation` で進め、main へ直接 push しない（PR で進める）。

## 整合性チェック結果（要点）
- 問題なし: `validate:procedures`/`lint`/`build`（`prebuild` で validate+画像コピー）は存在。Node ローカル v22、Next 16.3.3 の engines は `>=20.9.0` → **Node.js 22 系を使用**（CI の `setup-node` は `node-version: 22` 指定、`.nvmrc` も `22`）。`package-lock.json` あり。`docs/`・PRテンプレ・`.nvmrc` は未存在。`out/` は gitignore 済み。
- 要調整:
  1. `NEXT_PUBLIC_BASE_PATH` はビルド時に焼き込まれる（`lib/site.ts`、`procedure-search.tsx` の fetch）。検証CIの `out/`（BASE_PATH 空）は Pages（`/nursing-procedures`）にそのまま公開できない。
  2. 全手順に `updated: 2026-08-31` があり、素朴な日付検出は全件誤検知する。
  3. `claude.yml` は `contents: write`・`ANTHROPIC_API_KEY`・`anthropics/claude-code-action`・タグ参照を使う開発補助用。検証CI/デプロイとは完全に別扱い。
  4. `build` は validate を内包するが、CI では失敗箇所を明確にするため別ステップを維持。
  5. 静的エクスポート制約: 今回はCI/スクリプト/docsのみでルーティングに触れない。`next.config.ts`/`lib/site.ts` はコメントのみ変更。実装前に `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` を再確認。

## 1. ビルド成果物の扱い
- **通常CI（`ci.yml`）**: `npm ci` → `npm run ci` 後、`out/` を `actions/upload-artifact` で保存（名前 `site-ci-out`、保持日数短め）。用途は「検証済みビルドの確認・院内Webサーバー（ルート配信）への手動配置の元」。
- **Pages用（`deploy-pages.yml`）**: `main` のコードから `NEXT_PUBLIC_BASE_PATH=/nursing-procedures` で**再ビルド**し、`actions/upload-pages-artifact` で Pages 用 Artifact を作って渡す。
- **docs に明記**: 2種類の Artifact は用途が異なる。CI Artifact をデプロイに再利用しない理由＝(a) BASE_PATH がビルド時固定で配信先ごとに成果物が変わる、(b) PR ブランチ由来の成果物を公開経路に乗せない（公開は main のコードのみ）。

## 2. 外部 Action の許可範囲（すべて公式 `actions/*`、コミット SHA 固定）
| ワークフロー | 許可 Action |
|---|---|
| CI（`ci.yml`） | `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` |
| Pages デプロイ（`deploy-pages.yml`） | `actions/checkout`, `actions/setup-node`, `actions/upload-pages-artifact`, `actions/deploy-pages`（`configure-pages` は使わない。BASE_PATH は固定値で渡すため不要） |
- SHA は実装時に `gh api repos/actions/<name>/git/ref/tags/<tag>`（annotated tag は tag→commit を辿る）で取得し、取得元タグをコメントで併記。記憶や架空の SHA は使わない。取得不能なら実装を止めて報告。
- `claude.yml` は対象外（開発補助用、院内Gitには持ち込まない）。冒頭に分離を明記するコメントのみ追加。

## 3. デプロイの安全性（`deploy-pages.yml`）
- トリガーは `workflow_dispatch` のみ。
- 実行時ガード: 先頭ステップで `GITHUB_REF` が `refs/heads/main` でなければ失敗（UI で他ブランチを選んでも拒否）。`checkout` も `ref: main` ではなく実行 ref を使い、ガード通過後のみ進む。
- 権限分離: ワークフロー既定 `permissions: {}`。
  - `build` ジョブ: `contents: read` のみ。
  - `deploy` ジョブ（`needs: build`）: `pages: write`, `id-token: write`（deploy-pages の公式方式が OIDC を要求）、`environment: github-pages`。`contents` 権限なし。
- 独自シークレット・API キー不使用。必要な設定（Settings → Pages の Source を「GitHub Actions」、environment `github-pages` の保護ルール＝main のみ許可）を docs に明記。`id-token: write` は GitHub Pages 公式デプロイ専用で、院内移行時は不要になることも併記。
- 検証CI側は `contents: read` のみ、`pull_request_target` 不使用。

## 4. 患者情報チェック（`scripts/check-patient-info.mjs`）
- 対象: `procedures/**/*.md` 全体（frontmatter 含む）。画像は対象外。
- 判定: 失敗（終了コード 1）= 電話番号形式（ハイフン区切り・携帯 0[789]0）、生年月日文脈（「生年月日」「DOB」「生まれ」「Birth」の近傍の日付、和暦+日付）、10桁以上の連続数字、メールアドレス。警告（終了コード 0、`::warning` 等に依存せず標準出力に `WARN`）= 7–9桁数字、文脈なしの日付（`updated:` 行は frontmatter 既定フィールドとして OK 扱い）、「患者ID/ID/MRN」近傍の数字など曖昧なもの。`--strict` で警告も失敗にできる。
- 除外設定 `scripts/patient-info-allowlist.json`: エントリは `{file, line?, pattern(rule id), reason}` 必須。ファイル・ルール限定が必須で、ワイルドカード全体除外・ルール無効化は不可（スキーマ検証で拒否）。未使用エントリは警告（腐った除外の掃除用）。
- テスト: `scripts/__fixtures__/patient-info/{ng,warn,ok}/*.md`（`procedures/` 外なので validate/ビルドに混入しない）と、期待終了コードを検証する `scripts/test-patient-info.mjs`（`npm run test:patient-info`）。ケース: 生年月日文脈、長い連続数字、電話、通常の日付（OK）、薬剤量（例 `10 mg`、`500 mL`、`0.9% 100 mL`＝OK）、警告ケース。
- 既存 `procedures/` 全体を実際に走査し、誤検知ゼロ（または allowlist で理由付き限定除外）を確認して結果を報告。
- README/docs に明記: **画像内の文字は検出できない。最終確認は PR レビューでの目視。** このチェックは補助。

## 変更ファイル一覧
新規:
- `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`
- `.github/pull_request_template.md`（変更理由、患者情報なし確認、画像確認）
- `.nvmrc`（`22`＝Node.js 22 系）
- `scripts/check-patient-info.mjs`, `scripts/patient-info-allowlist.json`, `scripts/test-patient-info.mjs`, `scripts/__fixtures__/patient-info/…`
- `docs/branch-protection.md`（GitHub/Gitea/GitLab 対応表、CODEOWNERS は宣言のみでマージを止めない、承認記録はサーバー側レビュー履歴が正）
- `docs/operations.md`（ブランチ運用、承認基準、緊急修正、患者情報ルールと混入時対応、Artifact の2種類と理由）
- `docs/migration-to-internal-git.md`（GitHub→院内Git差分、claude.yml 非持ち込み、Action 許可一覧、BASE_PATH、Nginx の `try_files` 注記）
変更:
- `package.json` — scripts: `check:patient-info`, `test:patient-info`, `ci`（validate → check:patient-info → lint → build）
- `next.config.ts`, `lib/site.ts` — コメントのみ（動作不変）
- `.github/workflows/claude.yml` — 先頭コメントのみ
- `README.md`, `CLAUDE.md` — スクリプト・docs・デプロイ分離の反映（CLAUDE.md は配線のみ短く）

## 完了条件・検証
- ローカルで `npm run validate:procedures` / `lint` / `build` が成功（CI では `npm ci` 後に同コマンド）。
- `test:patient-info`: NG サンプルで終了コード非0、OK サンプルと通常 `procedures/` で0、警告サンプルは WARN 表示かつ0（`--strict` では非0）。
- `ci.yml` に `secrets.`、`pull_request_target`、GitHub 固有 API 呼び出しがないことを grep 確認。`deploy-pages.yml` の権限が build=`contents: read` / deploy=`pages: write`+`id-token: write` に分離されていることを確認。`actionlint` が使えれば実行。
- 全 Action の SHA が公式リポジトリで確認済みであること。
- 実 GitHub Actions 上の確認は、ユーザー承認後に作業ブランチを push して PR で行う。main へ直接 push しない。

## 作業工程の順番と各工程のテスト通過条件
0. **準備**: `feat/ops-foundation` ブランチ作成。`static-exports.md`・`ci-build-caching.md` を再読。
   - 通過条件: `git branch --show-current` が作業ブランチ、main に未コミット変更なし。
1. **現状確認**: `package.json`・`scripts/`・`claude.yml`・CLAUDE.md を確認（済、差分があれば追記）。
   - 通過条件: ベースラインで `validate:procedures` / `lint` / `build` が成功（以後の比較基準）。
2. **患者情報チェック＋サンプル**（`check-patient-info.mjs`、allowlist、fixtures、`test-patient-info.mjs`、npm scripts）。
   - 通過条件: `npm run test:patient-info` 全ケース合格 — NG は終了コード≠0、OK は 0、WARN は表示ありで 0（`--strict` で≠0）。既存 `procedures/` 全体の走査で失敗0（警告・除外は理由付きで報告）。allowlist が全体無効化を受け付けない（不正エントリでスキーマエラー）。
3. **検証CI**（`ci.yml`、`.nvmrc`、`npm run ci`、Action の SHA 取得）。
   - 通過条件: ローカル `npm run ci` 成功。`ci.yml` に `secrets.`/`pull_request_target`/`permissions` が `contents: read` 以外なし。使用 Action は checkout・setup-node・upload-artifact のみ、全て公式の確認済み SHA。`actionlint` 利用可なら警告なし。
4. **ビルドとデプロイの分離**（`deploy-pages.yml`）。
   - 通過条件: トリガーが `workflow_dispatch` のみ、main 以外を拒否するガードあり。build=`contents: read`、deploy=`pages: write`+`id-token: write`、既定 `permissions: {}`。`NEXT_PUBLIC_BASE_PATH=/nursing-procedures` で再ビルドし `out/` 内のアセット／検索インデックス参照が `/nursing-procedures/` 始まりであることをローカル build で確認。許可 Action は表のとおりのみ。
5. **PRテンプレート＋docs**（branch-protection / operations / migration）。
   - 通過条件: 必須項目の網羅を確認 — ブランチ保護5項目と GitHub/Gitea/GitLab 対応表、CODEOWNERS 注意、緊急修正手順、混入時対応、2種類の Artifact と理由、画像内文字は検出不可の明記、`claude.yml` 非持ち込み。docs 内リンク切れなし。
6. **コメント修正＋`claude.yml` 注記＋README/CLAUDE.md 更新**。
   - 通過条件: `next.config.ts`・`lib/site.ts` はコメントのみの diff（`git diff` で非コメント行の変更なし）、`claude.yml` も注釈のみ。`npm run build` の出力が工程1と同一。
7. **総合動作確認と報告**: `npm run validate:procedures`、`check:patient-info`、`test:patient-info`、`lint`、`build` を一通り実行。
   - 通過条件: 上記すべて成功。結果（コマンドと終了コード）を報告。ユーザー承認後に push → PR 作成、GitHub Actions 上で CI 成功を確認。main へ直接 push しない。

## この計画書の保存
本計画は `docs/plans/phase1-ops-foundation.md` としてリポジトリに保存済み。
