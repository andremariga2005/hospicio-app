-- Hospício · ficha de anamnese, histórico permanente e registro de acessos.
-- Regra: nenhum dado é apagado. Toda versão anterior de um aluno fica guardada.

-- ---------- ficha de anamnese ----------
create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null,
  email text not null,
  whatsapp text,
  respostas jsonb not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'arquivada')),
  aluno_id uuid references public.alunos on delete set null,
  revisado_em timestamptz
);
create index anamneses_status_idx on public.anamneses (status, criado_em desc);
alter table public.anamneses enable row level security;
-- qualquer pessoa com o link envia a ficha (só como pendente e sem vínculo)
create policy anamnese_enviar on public.anamneses for insert to anon, authenticated
  with check (status = 'pendente' and aluno_id is null and revisado_em is null);
create policy anamnese_ler on public.anamneses for select using (public.eh_treinador() or aluno_id = public.meu_aluno_id());
create policy anamnese_revisar on public.anamneses for update using (public.eh_treinador()) with check (public.eh_treinador());
grant insert on public.anamneses to anon;

-- ---------- histórico permanente dos alunos ----------
create table public.alunos_historico (
  id bigint generated always as identity primary key,
  aluno_id uuid not null,
  em timestamptz not null default now(),
  autor uuid,
  linha jsonb not null
);
create index alunos_historico_idx on public.alunos_historico (aluno_id, em desc);
alter table public.alunos_historico enable row level security;
create policy historico_ler on public.alunos_historico for select using (public.eh_treinador());

create or replace function public.guardar_versao_aluno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.alunos_historico (aluno_id, autor, linha) values (old.id, auth.uid(), to_jsonb(old));
  return new;
end $$;
create trigger alunos_guardar_versao after update on public.alunos for each row
  when (old.* is distinct from new.*) execute function public.guardar_versao_aluno();
revoke execute on function public.guardar_versao_aluno() from anon, authenticated, public;

-- ---------- registro de acessos ----------
create table public.acessos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  em timestamptz not null default now(),
  onde text,
  aparelho text
);
create index acessos_idx on public.acessos (user_id, em desc);
alter table public.acessos enable row level security;
create policy acessos_registrar on public.acessos for insert to authenticated with check (user_id = (select auth.uid()));
create policy acessos_ler on public.acessos for select using (public.eh_treinador() or user_id = (select auth.uid()));

-- ---------- gravação que mescla (nunca sobrescreve o que outro aparelho salvou) ----------
create or replace function public.mesclar_jsonb(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' and b <> '{}'::jsonb then
      (select coalesce(jsonb_object_agg(k, case when a ? k and b ? k then public.mesclar_jsonb(a -> k, b -> k) when b ? k then b -> k else a -> k end), '{}'::jsonb)
         from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) ks)
    else b
  end
$$;

create or replace function public.salvar_dados(aluno uuid, patch jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.alunos set dados = public.mesclar_jsonb(dados, patch) where id = aluno;
  if not found then raise exception 'Aluno não encontrado ou sem permissão'; end if;
end $$;
revoke execute on function public.salvar_dados(uuid, jsonb) from anon, public;
grant execute on function public.salvar_dados(uuid, jsonb) to authenticated;

-- ---------- nada se apaga ----------
drop policy if exists alunos_apagar on public.alunos;
drop policy if exists ala_apagar on public.ala;
