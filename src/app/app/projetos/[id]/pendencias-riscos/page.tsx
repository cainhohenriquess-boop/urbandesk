import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ProjectGovernanceClient } from "@/components/projetos/project-governance-client";
import { authOptions } from "@/lib/auth";
import { getProjectIssuesAndRisksData } from "@/lib/project-detail-data";

type ProjetoPendenciasRiscosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoPendenciasRiscosPage({
  params,
}: ProjetoPendenciasRiscosPageProps) {
  const { id } = await params;
  const data = await getProjectIssuesAndRisksData(id);
  const session = await getServerSession(authOptions);

  if (!data) notFound();

  const canManageGovernance = ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"].includes(
    session?.user?.role ?? ""
  );

  return (
    <ProjectGovernanceClient
      projectId={data.project.id}
      projectCode={data.project.code ?? null}
      projectName={data.project.name}
      initialIssues={data.issues}
      initialRisks={data.risks}
      initialIndicators={data.indicators}
      initialOptions={data.options}
      compatibility={{
        governanceOpsSchemaReady: data.compatibility.governanceOpsSchemaReady,
        notice: data.compatibility.governanceOpsNotice,
      }}
      canManageGovernance={canManageGovernance}
    />
  );
}
