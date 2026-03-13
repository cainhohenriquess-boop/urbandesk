import { ProjectEmptyState } from "@/components/projetos/project-empty-state";

type ProjetoFiscalizacaoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoFiscalizacaoPage({
  params,
}: ProjetoFiscalizacaoPageProps) {
  const { id } = await params;

  return (
    <ProjectEmptyState
      projectId={id}
      title="Sem registros de fiscalização"
      description="A estrutura de navegação por projeto já contempla fiscalização. Os registros e fluxos ainda precisam ser modelados no backend."
    />
  );
}
