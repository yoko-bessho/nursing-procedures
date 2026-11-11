"use client";

import { useState } from "react";
import { ProcedureMarkdown } from "@/app/procedures/_components/procedure-markdown";

// 申請画面のプレビューは閲覧サイトと同じ部品で描画する（申請者が見る表示と公開後の表示をそろえるため）。
// 雛形の段階で、その部品が Client Component から使えることをここで確かめる。
export function PreviewCheck() {
  const [markdown, setMarkdown] = useState("## 見出し\n\n- 箇条書き\n- **強調**");

  return (
    <div>
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={6}
        cols={60}
        aria-label="プレビュー確認用の Markdown"
      />
      <ProcedureMarkdown markdown={markdown} routePath="endoscopy/upper/egd-assist" />
    </div>
  );
}
