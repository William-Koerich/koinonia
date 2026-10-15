import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HeaderShell } from "./header-shell";

export function SiteHeader() {
  return (
    <HeaderShell
      acesso={
        // A sessão é lida na requisição: fica atrás de um Suspense para o
        // resto do header entrar no shell estático
        <Suspense fallback={<AcessoLink logado={false} />}>
          <Acesso />
        </Suspense>
      }
    />
  );
}

async function Acesso() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <AcessoLink logado={Boolean(data?.claims)} />;
}

function AcessoLink({ logado }: { logado: boolean }) {
  return (
    <Link
      href={logado ? "/app" : "/entrar"}
      className="inline-flex h-9 items-center rounded-full border border-current/30 px-4 text-sm transition-colors hover:bg-current/10"
    >
      {logado ? "Minha área" : "Entrar"}
    </Link>
  );
}
