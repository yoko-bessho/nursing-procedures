import type { Metadata } from "next";
import Link from "next/link";
import { getProcedureTree } from "@/lib/procedures";
import { Breadcrumbs } from "./_components/breadcrumbs";

export const metadata: Metadata = {
  title: "看護手順一覧",
  description: "内視鏡・処置・検査の看護手順（架空のサンプルデータ）。",
};

export default function ProceduresIndexPage() {
  const tree = getProcedureTree();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumbs trail={[{ href: "/procedures", label: "看護手順" }]} />
      <h1 className="text-2xl font-bold">看護手順</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        大分類 → カテゴリ → 個別手順の順にたどれます。内容はすべて架空のサンプルです。
      </p>

      <div className="mt-8 space-y-10">
        {tree.map((major) => (
          <section key={major.slug}>
            <h2 className="text-lg font-semibold">
              <Link href={`/procedures/${major.slug}`} className="hover:underline">
                {major.title}
              </Link>
            </h2>
            {major.description && (
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{major.description}</p>
            )}

            <div className="mt-4 space-y-5">
              {major.categories.map((category) => (
                <div key={category.slug}>
                  <h3 className="text-sm font-semibold text-black/70 dark:text-white/70">
                    <Link
                      href={`/procedures/${major.slug}/${category.slug}`}
                      className="hover:underline"
                    >
                      {category.title}
                    </Link>
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {category.procedures.map((procedure) => (
                      <li key={procedure.procedure}>
                        <Link
                          href={`/procedures/${procedure.routePath}`}
                          className="text-sm text-blue-700 hover:underline dark:text-blue-300"
                        >
                          {procedure.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
