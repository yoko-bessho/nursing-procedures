# ブランチ保護の仕様書

`main` を「レビューと承認を通ったものだけが入る」状態に保つための設定項目と、サーバー別の
対応表。アプリは特定の Git サーバーに依存しないので、移行時はこの表に沿って再設定する。

## 設定項目

| # | 設定項目 | 目的 |
|---|---|---|
| 1 | `main` への直接 push 禁止（変更は PR 経由のみ） | 未レビューの変更を入れない |
| 2 | 承認 1 名以上 | 作成者以外の目で確認する |
| 3 | CI の必須チェック（`verify`） | 規約違反・患者情報の疑い・ビルド失敗を入れない |
| 4 | 管理者も対象（例外を認めない） | 緊急時も同じ経路を通し、記録を残す |
| 5 | 承認後の追加コミットで承認を取り消す | 承認後に中身を差し替えられない |

補足: 作成者自身の承認を数えない設定があれば有効にする。force push と `main` の削除も禁止する。

## サーバー別の対応表

設定名は UI の版によって変わる。**移行時に実際の画面で名称を確認すること。**

| # | GitHub（Settings → Branches / Rulesets） | Gitea（Settings → Branches） | GitLab（Settings → Repository / Merge requests） |
|---|---|---|---|
| 1 | Require a pull request before merging | Disable push（push を無効化し、マージはPRのみ） | Protected branches: Allowed to push and merge = No one / Allowed to merge = Maintainers |
| 2 | Require approvals（1 以上） | Required approvals（1 以上） | Merge request approvals: Approvals required = 1 以上 |
| 3 | Require status checks to pass before merging（`verify` を指定） | Enable Status Check（チェック名のパターンに `verify` 相当を指定） | Merge checks: Pipelines must succeed |
| 4 | Do not allow bypassing the above settings（旧 Include administrators） | 管理者への適用設定（版により有無。無い場合は管理者権限者を最小にして運用で補う） | Protected branch は管理者にも適用（Allowed to push = No one）。承認ルールの上書きを許さない設定（Prevent editing approval rules in merge requests） |
| 5 | Dismiss stale pull request approvals when new commits are pushed | Dismiss stale approvals | Approval settings: Remove all approvals when commits are added to the source branch |
| 補 | Block force pushes / Do not allow deletions | Force push 無効 | Protected branch は既定で force push 不可 |

必須チェック名: ワークフロー `CI` のジョブ名 `verify`（`.github/workflows/ci.yml`）。GitHub では
一度実行された後でないと候補に出ない。移行先の CI でも同じ名前のジョブにそろえると設定を使い回せる。

## 注意

- **CODEOWNERS は担当者の宣言であり、それ自体にはマージを止める力がない。** サーバー側の
  「コードオーナーの承認を必須にする」設定を併用して初めて強制になるが、その設定名はサーバーごとに
  異なる。この運用の承認要件は上表の #2 で満たし、CODEOWNERS には依存しない。
- **承認の記録はサーバー側のレビュー履歴を正とする。** PR 本文のチェック欄やチャットでの了承は
  記録とみなさない。
- 保護設定の変更自体も、管理者以外が行えないようにする（設定変更の履歴はサーバーの監査ログで確認）。
