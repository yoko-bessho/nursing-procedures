import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMajor, getProcedureTree } from "@/lib/procedures";
import { Breadcrumbs } from "../_components/breadcrumbs";

// 静的エクスポートのため、想定外セグメントは 404 に倒して動的生成を行わない。
export const dynamicParams = false;

export function generateStaticParams() {
  return getProcedureTree().map((major) => ({ major: major.slug }));
}

export async function generateMetadata(props: PageProps<"/procedures/[major]">): Promise<Metadata> {
  const { major } = await props.params;
  const node = getMajor(major);
  return node ? { title: node.title } : {};
}

export default async function MajorPage(props: PageProps<"/procedures/[major]">) {
  const { major } = await props.params;
  const node = getMajor(major);
  if (!node) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumbs
        trail={[
          { href: "/procedures", label: "看護手順" },
          { href: `/procedures/${node.slug}`, label: node.title },
        ]}
      />
      <h1 className="text-2xl font-bold">{node.title}</h1>
      {node.description && (
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">{node.description}</p>
      )}

      <div className="mt-8 space-y-6">
        {node.categories.map((category) => (
          <section key={category.slug}>
            <h2 className="text-base font-semibold">
              <Link
                href={`/procedures/${node.slug}/${category.slug}`}
                className="hover:underline"
              >
                {category.title}
              </Link>
            </h2>
            {category.description && (
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {category.description}
              </p>
            )}
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
          </section>
        ))}
      </div>
    </main>
  );
}
