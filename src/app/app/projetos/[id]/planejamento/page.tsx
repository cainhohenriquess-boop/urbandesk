import { ProjectEmptyState } from "@/components/projetos/project-empty-state";

type ProjetoPlanejamentoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoPlanejamentoPage({
  params,
}: ProjetoPlanejamentoPageProps) {
  const { id } = await params;

  return (
    <ProjectEmptyState
      projectId={id}
      title="Sem planejamento detalhado"
      description="A rota de planejamento já faz parte da estrutura do projeto. Cronograma, marcos e dependências ainda precisam ser implementados."
    />
  );
}
