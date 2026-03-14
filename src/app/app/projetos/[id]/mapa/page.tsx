import { notFound } from "next/navigation";
import { ProjectMapWorkspace } from "@/components/projetos/project-map-workspace";
import { getProjectShellData } from "@/lib/project-pages";

type ProjetoMapaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoMapaPage({
  params,
}: ProjetoMapaPageProps) {
  const { id } = await params;
  const { project } = await getProjectShellData(id);

  if (!project) {
    notFound();
  }

  return (
    <ProjectMapWorkspace
      project={{
        id: project.id,
        name: project.name,
        code: project.code ?? null,
        status: project.status,
        operationalStatus: project.operationalStatus,
        responsibleDepartment: project.responsibleDepartment ?? null,
        neighborhood: project.neighborhood ?? null,
        region: project.region ?? null,
        technicalAreas: project.technicalAreas,
        _count: {
          assets: project._count.assets,
          documents: project._count.documents,
          measurements: project._count.measurements,
          inspections: project._count.inspections,
        },
      }}
    />
  );
}
