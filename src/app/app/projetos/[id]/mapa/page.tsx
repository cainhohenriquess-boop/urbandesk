import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProjectMapWorkspace } from "@/components/projetos/project-map-workspace";
import { authOptions } from "@/lib/auth";
import { getProjectShellData } from "@/lib/project-pages";

type ProjetoMapaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoMapaPage({
  params,
}: ProjetoMapaPageProps) {
  const { id } = await params;
  const { project } = await getProjectShellData(id);
  const session = await getServerSession(authOptions);

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
        district: project.district ?? null,
        region: project.region ?? null,
        technicalAreas: project.technicalAreas,
        _count: {
          assets: project._count.assets,
          documents: project._count.documents,
          measurements: project._count.measurements,
          inspections: project._count.inspections,
        },
      }}
      currentUser={{
        id: session?.user.id ?? null,
        name: session?.user.name ?? null,
        email: session?.user.email ?? null,
        role: session?.user.role ?? null,
      }}
    />
  );
}
