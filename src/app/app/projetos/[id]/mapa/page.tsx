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
    <ProjectMapWorkspace projectId={project.id} projectName={project.name} />
  );
}
