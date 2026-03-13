import { NextResponse } from "next/server";

export function requireJsonContentType(request: Request): NextResponse | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type inválido. Use application/json." },
      { status: 415 }
    );
  }
  return null;
}
