import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./env";

const ROTAS_DE_AUTH = ["/entrar", "/cadastro", "/recuperar-senha"];

/**
 * Renova a sessão (cookies) a cada requisição e protege /app/*.
 * A checagem de perfil/papel/ativo fica no layout da área logada e na RLS;
 * aqui só verificamos se existe uma sessão válida.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não colocar código entre a criação do client e getClaims(): é aqui que o
  // token é validado e, se preciso, renovado.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname, search, searchParams } = request.nextUrl;

  // Quando o Supabase não reconhece o endereço de retorno, ele manda o link do
  // e-mail para a raiz do Site URL (ex.: "/?code=..."). Encaminhamos para o
  // callback, que troca o código pela sessão.
  if (pathname !== "/auth/callback" && searchParams.has("code")) {
    return redirectPreservandoCookies(request, response, "/auth/callback", {
      code: searchParams.get("code")!,
      next: "/app",
    });
  }
  if (pathname === "/" && searchParams.has("error_code")) {
    return redirectPreservandoCookies(request, response, "/entrar", { erro: "link" });
  }

  if (!logado && (pathname === "/app" || pathname.startsWith("/app/"))) {
    return redirectPreservandoCookies(request, response, "/entrar", {
      next: pathname + search,
    });
  }

  if (logado && ROTAS_DE_AUTH.includes(pathname)) {
    return redirectPreservandoCookies(request, response, "/app");
  }

  return response;
}

function redirectPreservandoCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  params: Record<string, string> = {},
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(params).toString();

  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
