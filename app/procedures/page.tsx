import type { Metadata } from "next";
import Link from "next/link";
import { getProcedureTree } from "@/lib/procedures";
import { ProcedureSearch } from "./_components/procedure-search";

export const metadata: Metadata = {
  title: "看護手順一覧",
  description: "内視鏡・処置・検査の看護手順（架空のサンプルデータ）。",
};

// セクションのトップ。大分類はヘッダーのバーで切り替えられるので、ここは
// 各大分類の入口（概要＋カテゴリ一覧）だけを並べた着地ページにとどめる。
export default function ProceduresIndexPage() {
  const tree = getProcedureTree();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">看護手順</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        上のバーで大分類を選び、左のカテゴリから個別手順へ進みます。内容はすべて架空のサンプルです。
      </p>

      <div className="mt-6 max-w-xl">
        <ProcedureSearch />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((major) => (
          <section
            key={major.slug}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <h2 className="text-lg font-semibold">
              <Link href={`/procedures/${major.slug}`} className="hover:underline">
                {major.title}
              </Link>
            </h2>
            {major.description && (
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{major.description}</p>
            )}
            <ul className="mt-3 space-y-1 text-sm">
              {major.categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/procedures/${category.routePath}`}
                    className="text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {category.title}
                  </Link>
                  <span className="text-black/40 dark:text-white/40">
                    {" "}
                    （{category.procedures.length}）
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
