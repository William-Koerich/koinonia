"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { TAGS } from "@/lib/cache-tags";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { STORAGE_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  contribuicaoSchema,
  pastorSchema,
  projetoSchema,
  type ContribuicaoInput,
  type PastorInput,
  type ProjetoInput,
} from "@/lib/validation/conteudo";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Apaga do bucket a imagem que deixou de ser usada (falha aqui não impede o salvamento) */
async function removerImagem(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

// ---------------------------------------------------------------- pastores

export async function salvarPastor(id: string | null, input: PastorInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = pastorSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  let fotoAntiga: string | null = null;
  if (id) {
    const { data } = await supabase.from("koinonia_pastores").select("foto_path").eq("id", id).maybeSingle();
    fotoAntiga = data?.foto_path ?? null;
  }

  const { error } = id
    ? await supabase.from("koinonia_pastores").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_pastores").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  if (fotoAntiga !== parsed.data.foto_path) await removerImagem(supabase, fotoAntiga);

  updateTag(TAGS.pastores);
  revalidatePath("/app/conteudo/pastores");
  redirect("/app/conteudo/pastores");
}

export async function excluirPastor(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_pastores").delete().eq("id", id).select("foto_path").maybeSingle();
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  await removerImagem(supabase, data?.foto_path);

  updateTag(TAGS.pastores);
  revalidatePath("/app/conteudo/pastores");
  return { ok: true, message: "Pastor removido do site." };
}

// ---------------------------------------------------------------- projetos

export async function salvarProjeto(id: string | null, input: ProjetoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = projetoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  let imagemAntiga: string | null = null;
  if (id) {
    const { data } = await supabase.from("koinonia_projetos").select("imagem_path").eq("id", id).maybeSingle();
    imagemAntiga = data?.imagem_path ?? null;
  }

  const { error } = id
    ? await supabase.from("koinonia_projetos").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_projetos").insert(parsed.data);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um projeto com esse endereço.", fieldErrors: { slug: ["Endereço já usado por outro projeto."] } };
    }
    return { ok: false, error: mensagemErroBanco(error) };
  }

  if (imagemAntiga !== parsed.data.imagem_path) await removerImagem(supabase, imagemAntiga);

  updateTag(TAGS.projetos);
  revalidatePath("/app/conteudo/projetos");
  redirect("/app/conteudo/projetos");
}

export async function excluirProjeto(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_projetos").delete().eq("id", id).select("imagem_path").maybeSingle();
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  await removerImagem(supabase, data?.imagem_path);

  updateTag(TAGS.projetos);
  revalidatePath("/app/conteudo/projetos");
  return { ok: true, message: "Projeto excluído." };
}

// ---------------------------------------------------------------- contribuição

export async function salvarContribuicao(input: ContribuicaoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = contribuicaoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_configuracoes_contribuicao")
    .upsert({ id: true, ...parsed.data });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  updateTag(TAGS.contribuicao);
  return { ok: true, message: "Dados de contribuição atualizados no site." };
}
