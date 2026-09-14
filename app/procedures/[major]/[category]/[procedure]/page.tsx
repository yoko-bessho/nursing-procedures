import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllProcedureParams,
  getMajor,
  getProcedure,
} from "@/lib/procedures";
import { Breadcrumbs } from "../../../_components/breadcrumbs";
import { ProcedureMarkdown } from "../../../_components/procedure-markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllProcedureParams();
}

export async function generateMetadata(
  props: PageProps<"/procedures/[major]/[category]/[procedure]">,
): Promise<Metadata> {
  const { major, category, procedure } = await props.params;
  const detail = getProcedure(major, category, procedure);
  return detail
    ? { title: detail.frontmatter.title, description: detail.frontmatter.summary }
    : {};
}

export default async function ProcedurePage(
  props: PageProps<"/procedures/[major]/[category]/[procedure]">,
) {
  const { major, category, procedure } = await props.params;
  const detail = getProcedure(major, category, procedure);
  const majorNode = getMajor(major);
  const categoryNode = majorNode?.categories.find((c) => c.slug === category);
  if (!detail || !majorNode || !categoryNode) notFound();

  const { frontmatter } = detail;

  return (
    <main className="max-w-3xl">
      <Breadcrumbs
        trail={[
          { href: "/procedures", label: "看護手順" },
          { href: `/procedures/${majorNode.slug}`, label: majorNode.title },
          { href: `/procedures/${categoryNode.routePath}`, label: categoryNode.title },
          { href: `/procedures/${detail.routePath}`, label: frontmatter.title },
        ]}
      />

      <h1 className="text-2xl font-bold">{frontmatter.title}</h1>
      {frontmatter.summary && (
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">{frontmatter.summary}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/50 dark:text-white/50">
        {frontmatter.updated && <span>更新: {frontmatter.updated}</span>}
        {frontmatter.tags.length > 0 && <span>タグ: {frontmatter.tags.join(" / ")}</span>}
      </div>

      <hr className="my-6 border-black/10 dark:border-white/15" />

      <ProcedureMarkdown markdown={detail.markdown} routePath={detail.routePath} />
    </main>
  );
}
