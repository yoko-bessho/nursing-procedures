import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">看護手順アプリ</h1>
      <p className="mt-4 text-black/70 dark:text-white/70">
        看護手順書を Markdown で管理し、静的サイトとして配信するためのアプリです。
        掲載しているのは内視鏡・処置・検査を題材にした架空のサンプルデータです。
      </p>
      <Link
        href="/procedures"
        className="mt-8 inline-block rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        看護手順一覧を見る
      </Link>
    </main>
  );
}
