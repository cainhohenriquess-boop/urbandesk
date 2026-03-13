import { ProjectEmptyState } from "@/components/projetos/project-empty-state";

type ProjetoFinanceiroPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoFinanceiroPage({
  params,
}: ProjetoFinanceiroPageProps) {
  const { id } = await params;

  return (
    <ProjectEmptyState
      projectId={id}
      title="Sem dados financeiros do projeto"
      description="A rota está pronta para receber orçamento detalhado, medições financeiras e execução orçamentária por projeto."
    />
  );
}
