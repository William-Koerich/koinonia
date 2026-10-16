-- =============================================================================
-- Koinonia — PIX por evento e inscrição de convidados
--
-- 1) Cada evento pode ter a própria chave PIX (senão vale a da igreja). A
--    chave pode ser CPF/telefone pessoal do responsável, então não é exposta
--    ao público anônimo: anon passa a ter SELECT só nas colunas do site.
-- 2) O responsável pelo evento (ou PASTOR/ADMIN) inscreve outras pessoas:
--    membros com conta ou convidados sem conta (nome/celular).
-- =============================================================================

-- ------------------------------------------------------------------- 1) PIX
alter table public.koinonia_eventos
  add column pix_chave     text check (char_length(pix_chave) <= 100),
  add column pix_tipo      public.koinonia_tipo_chave_pix,
  add column pix_recebedor text check (char_length(pix_recebedor) <= 25),
  add constraint koinonia_eventos_pix_tipo check (pix_chave is null or pix_tipo is not null);

-- anon (site público) não lê as colunas de PIX. Novas colunas precisam ser
-- liberadas aqui explicitamente se forem para o site.
revoke select on public.koinonia_eventos from anon;
grant select (
  id, titulo, descricao, cep, logradouro, numero, complemento, bairro, cidade, uf,
  inicio, fim, valor, responsavel_id, publico, created_by, created_at, updated_at
) on public.koinonia_eventos to anon;

-- ------------------------------------------------------------ 2) convidados
alter table public.koinonia_evento_inscricoes
  alter column profile_id drop not null,
  add column convidado_nome    text check (char_length(btrim(convidado_nome)) between 2 and 150),
  add column convidado_celular text check (convidado_celular ~ '^\d{10,11}$'),
  add column adicionado_por    uuid references public.koinonia_profiles (id) on delete set null,
  -- ou é um membro (profile_id) ou um convidado (nome), nunca os dois
  add constraint koinonia_evento_inscricoes_quem check (
    (profile_id is not null and convidado_nome is null and convidado_celular is null)
    or (profile_id is null and convidado_nome is not null)
  );

create index koinonia_evento_inscricoes_adicionado_por_idx on public.koinonia_evento_inscricoes (adicionado_por);

-- Regras: inscrição própria tem status decidido pelo banco; inscrição feita
-- pelo responsável (de outro membro ou convidado) mantém o status escolhido.
create or replace function public.koinonia_evento_inscricoes_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento record;
  v_genero public.koinonia_genero;
  v_uid    uuid := (select auth.uid());
begin
  select valor, publico, fim into v_evento from public.koinonia_eventos where id = new.evento_id;
  if not found then
    raise exception 'Evento não encontrado.' using errcode = 'P0001';
  end if;
  if v_evento.fim < now() then
    raise exception 'As inscrições para este evento estão encerradas.' using errcode = 'P0001';
  end if;

  -- público do evento (convidado não tem gênero cadastrado: o responsável decide)
  if new.profile_id is not null then
    select genero into v_genero from public.koinonia_profiles where id = new.profile_id;
    if v_evento.publico = 'homens' and v_genero is distinct from 'masculino' then
      raise exception 'Este evento é exclusivo para homens.' using errcode = 'P0001';
    end if;
    if v_evento.publico = 'mulheres' and v_genero is distinct from 'feminino' then
      raise exception 'Este evento é exclusivo para mulheres.' using errcode = 'P0001';
    end if;
  end if;

  if v_uid is not null then
    new.pagamento_informado_em := null;
    if new.profile_id = v_uid then
      -- o próprio membro se inscrevendo
      new.status := case when v_evento.valor is null then 'confirmada' else 'pendente' end;
      new.decidido_por := null;
      new.decidido_em := case when v_evento.valor is null then now() end;
      new.adicionado_por := null;
    else
      -- responsável/PASTOR/ADMIN inscrevendo outra pessoa (a RLS garante quem)
      if new.status = 'recusada' then new.status := 'pendente'; end if;
      if v_evento.valor is null then new.status := 'confirmada'; end if;
      new.adicionado_por := v_uid;
      new.decidido_por := case when new.status = 'confirmada' then v_uid end;
      new.decidido_em := case when new.status = 'confirmada' then now() end;
    end if;
  end if;
  return new;
end;
$$;

-- convidados não mudam para membro (nem o contrário) depois de criados
create or replace function public.koinonia_evento_inscricoes_decisao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.evento_id is distinct from old.evento_id or new.profile_id is distinct from old.profile_id then
    raise exception 'Não é possível mover a inscrição para outro evento ou pessoa.' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status then
    new.decidido_em := now();
    new.decidido_por := (select auth.uid());
  end if;
  return new;
end;
$$;

-- quem pode inscrever: a si mesmo, ou o responsável/PASTOR/ADMIN qualquer pessoa
alter policy "koinonia_evento_inscricoes_insert" on public.koinonia_evento_inscricoes
  with check (
    (profile_id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()))
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_responsavel_evento(evento_id)
  );
