/* eslint-disable @next/next/no-img-element */
// 手順本文の画像は Markdown 由来で寸法が不定、かつ静的エクスポートでは next/image の
// 最適化が効かない。素の <img> を意図的に使うため、このファイルだけルールを無効化する。
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveImageSrc } from "@/lib/procedures";

// react-markdown はデフォルトで生 HTML を描画しない（安全側）。リポジトリ管理の信頼できる
// Markdown だが、あえて既定のサニタイズに任せる。相対画像パスだけコピー済みアセットへ差し替える。
export function ProcedureMarkdown({
  markdown,
  routePath,
}: {
  markdown: string;
  routePath: string;
}) {
  const components: Components = {
    img({ src, alt, title }) {
      const resolved = typeof src === "string" ? resolveImageSrc(routePath, src) : src;
      return <img src={resolved} alt={alt ?? ""} title={title} loading="lazy" />;
    },
  };

  return (
    <div className="procedure-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
