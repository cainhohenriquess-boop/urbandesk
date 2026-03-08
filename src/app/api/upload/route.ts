import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // ─────────────────────────────────────────────
    // 🚀 FUTURO BUCKET (Cloudflare R2 / Supabase Storage)
    // ─────────────────────────────────────────────
    // Aqui entrará a lógica real. Exemplo Supabase:
    // await supabase.storage.from('obras').upload(fileName, file);
    
    // Simula o tempo de upload na rede 3G/4G
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Retornamos URLs fictícias (Mock) para salvar no PostgreSQL de forma leve
    const urls = files.map((file, i) =>
      `https://cdn.urbandesk.com.br/assets/mock-img-${Date.now()}-${i}.jpg`
    );

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}