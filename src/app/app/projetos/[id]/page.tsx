import { notFound } from "next/navigation";
import { ProjectSummaryTab } from "@/components/projetos/project-summary-tab";
import { getProjectOverviewData } from "@/lib/project-detail-data";

type ProjetoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Projeto360Page({ params }: ProjetoPageProps) {
  const { id } = await params;
  const data = await getProjectOverviewData(id);

  if (!data) {
    notFound();
  }

  return <ProjectSummaryTab data={data} />;
}
