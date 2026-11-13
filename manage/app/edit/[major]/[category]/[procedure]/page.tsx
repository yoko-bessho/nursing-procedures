import type { Metadata } from "next";
import { EditForm } from "./edit-form";

export const metadata: Metadata = { title: "手順の修正申請（開発中）" };

export default async function EditPage(props: PageProps<"/edit/[major]/[category]/[procedure]">) {
  const { major, category, procedure } = await props.params;
  return <EditForm major={major} category={category} procedure={procedure} />;
}
