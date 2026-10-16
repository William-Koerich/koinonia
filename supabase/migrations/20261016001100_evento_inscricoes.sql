-- =============================================================================
-- Koinonia — inscrições em eventos
--
-- O membro se inscreve (pendente). Em evento pago, ele paga por fora (PIX) e
-- avisa "já paguei"; o responsável pelo evento, PASTOR ou ADMIN confirma ou
-- recusa. Evento gratuito confirma na hora. (Gateway de pagamento: futuro.)
-- =============================================================================

create type public.koinonia_inscricao_status as enum ('pendente', 'confirmada', 'recusada');

create table public.koinonia_evento_inscricoes (
  id                     uuid primary key default gen_random_uuid(),
  evento_id              uuid not null references public.koinonia_eventos (id) on delete cascade,
  profile_id             uuid not null references public.koinonia_profiles (id) on delete cascade,
  status                 public.koinonia_inscricao_status not null default 'pendente',
  observacao             text check (char_length(observacao) <= 500),
  -- o membro avisou que pagou (o responsável confere e confirma)
  pagamento_informado_em timestamptz,
  decidido_em            timestamptz,
  decidido_por           uuid references public.koinonia_profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  constraint koinonia_evento_inscricoes_unica unique (evento_id, profile_id)
);

create index koinonia_evento_inscricoes_profile_idx on public.koinonia_evento_inscricoes (profile_id);
create index koinonia_evento_inscricoes_evento_status_idx on public.koinonia_evento_inscricoes (evento_id, status);
create index koinonia_evento_inscricoes_decidido_por_idx on public.koinonia_evento_inscricoes (decidido_por);

-- o usuário logado é o responsável por este evento?
create or replace function public.koinonia_is_responsavel_evento(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.koinonia_eventos
    where id = p_evento_id and responsavel_id = (select auth.uid())
  ) and public.koinonia_is_membro_ativo();
$$;

revoke execute on function public.koinonia_is_responsavel_evento(uuid) from public, anon;
grant execute on function public.koinonia_is_responsavel_evento(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Regras da inscrição (antes de inserir)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_inscricoes_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento record;
  v_genero public.koinonia_genero;
begin
  select valor, publico, fim into v_evento from public.koinonia_eventos where id = new.evento_id;
  if not found then
    raise exception 'Evento não encontrado.' using errcode = 'P0001';
  end if;
  if v_evento.fim < now() then
    raise exception 'As inscrições para este evento estão encerradas.' using errcode = 'P0001';
  end if;

  select genero into v_genero from public.koinonia_profiles where id = new.profile_id;
  if v_evento.publico = 'homens' and v_genero is distinct from 'masculino' then
    raise exception 'Este evento é exclusivo para homens.' using errcode = 'P0001';
  end if;
  if v_evento.publico = 'mulheres' and v_genero is distinct from 'feminino' then
    raise exception 'Este evento é exclusivo para mulheres.' using errcode = 'P0001';
  end if;

  -- inscrição feita pelo próprio membro: status decidido pelo banco
  if (select auth.uid()) is not null then
    new.status := case when v_evento.valor is null then 'confirmada' else 'pendente' end;
    new.pagamento_informado_em := null;
    new.decidido_por := null;
    new.decidido_em := case when v_evento.valor is null then now() end;
  end if;
  return new;
end;
$$;

create trigger koinonia_evento_inscricoes_validar
  before insert on public.koinonia_evento_inscricoes
  for each row execute function public.koinonia_evento_inscricoes_validar();

-- quem decide fica registrado; evento e pessoa não mudam depois de criada
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

create trigger koinonia_evento_inscricoes_decisao
  before update on public.koinonia_evento_inscricoes
  for each row execute function public.koinonia_evento_inscricoes_decisao();

-- o membro avisa que pagou (só na própria inscrição pendente)
create or replace function public.koinonia_informar_pagamento(p_evento_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.koinonia_evento_inscricoes
     set pagamento_informado_em = now()
   where evento_id = p_evento_id
     and profile_id = (select auth.uid())
     and status = 'pendente';
  if not found then
    raise exception 'Você não tem inscrição pendente neste evento.' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.koinonia_informar_pagamento(uuid) from public, anon;
grant execute on function public.koinonia_informar_pagamento(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
--   ver:      a própria | responsável pelo evento | ADMIN/PASTOR
--   inscrever: só a si mesmo, sendo membro ativo (regras no trigger)
--   decidir (update): responsável pelo evento | ADMIN/PASTOR
--   cancelar (delete): a própria enquanto pendente/recusada | responsável | ADMIN/PASTOR
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_evento_inscricoes from anon;
grant select, insert, update, delete on public.koinonia_evento_inscricoes to authenticated;
alter table public.koinonia_evento_inscricoes enable row level security;

create policy "koinonia_evento_inscricoes_select" on public.koinonia_evento_inscricoes
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_responsavel_evento(evento_id)
  );

create policy "koinonia_evento_inscricoes_insert" on public.koinonia_evento_inscricoes
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()));

create policy "koinonia_evento_inscricoes_update" on public.koinonia_evento_inscricoes
  for update to authenticated
  using ((select public.koinonia_is_admin_or_pastor()) or public.koinonia_is_responsavel_evento(evento_id))
  with check ((select public.koinonia_is_admin_or_pastor()) or public.koinonia_is_responsavel_evento(evento_id));

create policy "koinonia_evento_inscricoes_delete" on public.koinonia_evento_inscricoes
  for delete to authenticated
  using (
    (profile_id = (select auth.uid()) and status in ('pendente', 'recusada'))
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_responsavel_evento(evento_id)
  );
