import { notFound } from "next/navigation";
import { ProjectShellNav } from "@/components/projetos/project-shell-nav";
import { ProjectShellHeader } from "@/components/projetos/project-shell-header";
import { ProjectRouteLayoutFrame } from "@/components/projetos/project-route-layout-frame";
import { ProjectSchemaWarning } from "@/components/projetos/project-schema-warning";
import { getProjectShellData } from "@/lib/project-pages";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjetoLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;
  const { project, compatibility } = await getProjectShellData(id);

  if (!compatibility.governanceSchemaReady && compatibility.notice) {
    return <ProjectSchemaWarning notice={compatibility.notice} />;
  }

  if (!project) {
    notFound();
  }

  return (
    <ProjectRouteLayoutFrame
      header={<ProjectShellHeader project={project} />}
      nav={<ProjectShellNav projectId={project.id} />}
    >
      {children}
    </ProjectRouteLayoutFrame>
  );
}
