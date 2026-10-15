import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/validation/auth";

/**
 * Destino dos links enviados por e-mail (recuperação de senha). Troca o
 * código PKCE pela sessão e redireciona.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = caminhoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const erro = new URL("/entrar", request.url);
  erro.searchParams.set("erro", "link");
  return NextResponse.redirect(erro);
}
