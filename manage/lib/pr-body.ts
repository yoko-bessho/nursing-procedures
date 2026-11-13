// PR のタイトルと本文を組み立てる。申請画面のプレビューとサーバーの両方で同じ関数を使い、
// 申請者が確認した内容と実際に作られる PR をそろえる（サーバーはブラウザから来た完成品を信用せず作り直す）。

export const LIMITS = {
  requester: 50,
  prTitle: 120,
  reason: 2000,
  changeNote: 4000,
  title: 200,
  summary: 500,
  tag: 30,
  tags: 20,
  body: 100_000,
} as const;

// 制御文字（改行とタブ以外）は表示を崩したり見えない文字を紛れ込ませたりするため除く。
export function stripControl(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

// PR の本文やタイトルの `@名前` は GitHub が通知を飛ばす。申請者の自由入力から意図しない通知が
// 出ないよう、全角の＠に置き換えて無害化する（見た目で分かる形にしておく）。
export function neutralizeMentions(s: string): string {
  return s.replace(/@(?=[A-Za-z0-9-])/g, "＠");
}

const clean = (s: string) => neutralizeMentions(stripControl(s)).trim();

export type PullRequestDraft = {
  requester: string;
  reason: string;
  changeNote: string;
  prTitle: string;
};

export type PullRequestContext = {
  filePath: string;
  procedureTitle: string;
  baseVersion: string;
  requestedAt: string;
};

export function defaultPrTitle(procedureTitle: string): string {
  return `看護手順の修正: ${procedureTitle}`;
}

export function buildPullRequest(draft: PullRequestDraft, ctx: PullRequestContext) {
  const title = clean(draft.prTitle) || defaultPrTitle(ctx.procedureTitle);
  // 構成は .github/pull_request_template.md にそろえる。確認チェックはレビュアーが見て付ける欄なので、
  // 申請者もアプリもオンにしない（自動で付けると「確認済み」に見えてしまう）。
  const body = [
    "## 変更理由",
    "",
    clean(draft.reason),
    "",
    "## 変更内容",
    "",
    `- 対象: \`${ctx.filePath}\`（${clean(ctx.procedureTitle)}）`,
    clean(draft.changeNote) ? `\n${clean(draft.changeNote)}` : "",
    "",
    "## 申請情報",
    "",
    `- 申請者（未認証・自己申告）: ${clean(draft.requester)}`,
    `- 申請日時: ${ctx.requestedAt}`,
    `- 元のバージョン: \`${ctx.baseVersion}\``,
    "- 作成経路: 申請アプリ（manage）",
    "",
    "## 確認チェック",
    "",
    "- [ ] 患者情報（氏名・生年月日・ID・連絡先・日付入りの個別症例など）を本文にも画像にも含めていない",
    "- [ ] 画像をすべて目視で確認した（写り込み・モニタ表示・リストバンド・ファイル名・EXIF を含む）。画像を追加・変更していない場合は「該当なし」",
    "- [ ] `npm run ci` がローカルまたは CI で通っている",
    "- [ ] 手順の内容を、承認者が確認できる根拠（規程・ガイドライン等）と突き合わせた",
    "",
    "> 患者情報チェック（`npm run check:patient-info`）は補助です。**画像内の文字は検出できない**ため、",
    "> 画像の最終確認はレビュアーの目視で行います。",
    "",
  ].join("\n");
  return { title, body };
}

export function formatRequestedAt(now = new Date()): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);
}
