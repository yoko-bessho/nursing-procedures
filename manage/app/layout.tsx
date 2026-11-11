import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "手順の申請（開発中）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
