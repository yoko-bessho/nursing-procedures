import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMajor, getProcedureTree } from "@/lib/procedures";
import { Breadcrumbs } from "../../_components/breadcrumbs";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProcedureTree().flatMap((major) =>
    major.categories.map((category) => ({ major: major.slug, category: category.slug })),
  );
}

export async function generateMetadata(
  props: PageProps<"/procedures/[major]/[category]">,
): Promise<Metadata> {
  const { major, category } = await props.params;
  const node = getMajor(major)?.categories.find((c) => c.slug === category);
  return node ? { title: node.title } : {};
}

export default async function CategoryPage(props: PageProps<"/procedures/[major]/[category]">) {
  const { major, category } = await props.params;
  const majorNode = getMajor(major);
  const node = majorNode?.categories.find((c) => c.slug === category);
  if (!majorNode || !node) notFound();

  return (
    <main>
      <Breadcrumbs
        trail={[
          { href: "/procedures", label: "看護手順" },
          { href: `/procedures/${majorNode.slug}`, label: majorNode.title },
          { href: `/procedures/${node.routePath}`, label: node.title },
        ]}
      />
      <h1 className="text-2xl font-bold">{node.title}</h1>
      {node.description && (
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">{node.description}</p>
      )}

      <ul className="mt-8 space-y-4">
        {node.procedures.map((procedure) => (
          <li key={procedure.procedure}>
            <Link
              href={`/procedures/${procedure.routePath}`}
              className="font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              {procedure.title}
            </Link>
            {procedure.summary && (
              <p className="mt-0.5 text-sm text-black/60 dark:text-white/60">{procedure.summary}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
