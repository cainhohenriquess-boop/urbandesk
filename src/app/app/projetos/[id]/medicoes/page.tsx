import { ProjectEmptyState } from "@/components/projetos/project-empty-state";

type ProjetoMedicoesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoMedicoesPage({
  params,
}: ProjetoMedicoesPageProps) {
  const { id } = await params;

  return (
    <ProjectEmptyState
      projectId={id}
      title="Sem medições registradas"
      description="A rota de medições já existe e está integrada ao layout do projeto. A modelagem de medições ainda é uma pendência funcional."
    />
  );
}
