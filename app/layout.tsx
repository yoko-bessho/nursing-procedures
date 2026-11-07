import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

// next/font/google はビルド時に Google Fonts へ取りに行くため、外部通信を遮断した院内 CI では
// ビルドが通らない。フォントファイルをリポジトリに含めてビルドの外部依存をなくす（ライセンスは
// app/fonts/OFL.txt）。サブセットは latin のみで、日本語は従来どおりシステムフォントに落ちる。
const geistSans = localFont({
  src: "./fonts/Geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "看護手順アプリ（架空データ版）",
    template: "%s｜看護手順アプリ",
  },
  description:
    "Markdown を正とし静的サイトとして配信する看護手順アプリ。掲載内容はすべて架空のサンプルです。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* 公開する医療系コンテンツのため、全ページで架空データであることを明示する。 */}
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          これはポートフォリオ用のデモです。掲載手順はすべて<strong>架空のサンプル</strong>であり、
          実際の看護・医療行為の根拠には使用しないでください。
        </div>
        <header className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <Link href="/" className="text-sm font-semibold hover:underline">
            看護手順アプリ
          </Link>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
