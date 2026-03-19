import { notFound } from "next/navigation";
import { ProjectMeasurementsClient } from "@/components/projetos/project-measurements-client";
import { ProjectSchemaWarning } from "@/components/projetos/project-schema-warning";
import { getProjectMeasurementsData } from "@/lib/project-detail-data";

type ProjetoMedicoesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoMedicoesPage({
  params,
}: ProjetoMedicoesPageProps) {
  const { id } = await params;
  const data = await getProjectMeasurementsData(id);

  if (!data) {
    notFound();
  }

  if (!data.compatibility.measurementSchemaReady) {
    return (
      <ProjectSchemaWarning
        notice={
          data.compatibility.measurementNotice ??
          "As medições do projeto ainda dependem de migration complementar no banco publicado."
        }
      />
    );
  }

  return (
    <ProjectMeasurementsClient
      projectId={id}
      projectCode={data.project.code}
      projectName={data.project.name}
      initialMeasurements={data.measurements}
      initialIndicators={data.measurementIndicators}
      initialOptions={data.options}
    />
  );
}
