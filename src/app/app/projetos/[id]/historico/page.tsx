import { notFound } from "next/navigation";
import { ProjectHistoryClient } from "@/components/projetos/project-history-client";
import { getProjectHistoryData } from "@/lib/project-detail-data";

type ProjetoHistoricoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoHistoricoPage({
  params,
}: ProjetoHistoricoPageProps) {
  const { id } = await params;
  const data = await getProjectHistoryData(id);

  if (!data) notFound();

  return (
    <ProjectHistoryClient
      projectId={data.project.id}
      initialEvents={data.events}
      initialIndicators={data.indicators}
      technicalAreas={data.project.technicalAreas}
    />
  );
}
