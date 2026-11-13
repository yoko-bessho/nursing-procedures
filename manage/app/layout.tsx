import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "手順の申請（開発中）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body className="mx-auto max-w-6xl px-4 py-6">{children}</body>
    </html>
  );
}
