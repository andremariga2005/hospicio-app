-- Hospício · Abel Colognese
-- Banco do app da consultoria: perfis, alunos, execuções (vídeos), a ala e configuração.
-- Regra de ouro: a aluna só enxerga o que é dela; o treinador enxerga tudo.

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table public.perfis (
  id uuid primary key references auth.users on delete cascade,
  papel text not null check (papel in ('aluna', 'treinador')),
  nome text,
  criado_em timestamptz not null default now()
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  nome text not null,
  email text,
  cidade text,
  idade int,
  sexo text check (sexo in ('f', 'm')),
  plano text not null check (plano in ('Essential', 'Premium', 'Full Access')),
  inicio timestamptz not null default now(),
  freq int not null default 4 check (freq between 1 and 7),
  objetivo text,
  nivel text,
  -- tudo o que a aluna registra no dia a dia: semanas, treinos, cargas, peso, diário, dieta, volume…
  dados jsonb not null default '{}'::jsonb,
  demo boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index alunos_user_idx on public.alunos (user_id);

create table public.execucoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos on delete cascade,
  exercicio text not null,
  nota text,
  arquivo text,                -- caminho no Storage (bucket "execucoes")
  enviado_em timestamptz not null default now(),
  status text not null default 'aguardando' check (status in ('aguardando', 'respondido')),
  veredito text check (veredito in ('patetica', 'aceitavel', 'perfeita')),
  resposta text,
  respondido_em timestamptz
);
create index execucoes_aluno_idx on public.execucoes (aluno_id, enviado_em desc);

create table public.ala (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.alunos on delete cascade,
  tipo text not null check (tipo in ('treino', 'abel')),
  nome text,                   -- só o primeiro nome
  ficha text,
  duracao int,
  series int,
  volume int,
  melhor text,
  recorde boolean not null default false,
  texto text,
  reis uuid[] not null default '{}',
  em timestamptz not null default now()
);
create index ala_em_idx on public.ala (em desc);

create table public.config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- ---------- funções de apoio ----------
create or replace function public.eh_treinador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'treinador')
$$;

create or replace function public.meu_aluno_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.alunos where user_id = (select auth.uid()) limit 1
$$;

-- a aluna atualiza só os próprios dados do dia a dia; plano, início, nome e acesso são do treinador
create or replace function public.proteger_campos_aluno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  if public.eh_treinador() or auth.uid() is null then return new; end if;
  if new.user_id is distinct from old.user_id or new.plano is distinct from old.plano or new.inicio is distinct from old.inicio
     or new.freq is distinct from old.freq or new.nome is distinct from old.nome or new.ativo is distinct from old.ativo
     or new.demo is distinct from old.demo or new.email is distinct from old.email then
    raise exception 'Só o treinador altera plano, início, frequência e acesso.';
  end if;
  return new;
end $$;
create trigger alunos_proteger before update on public.alunos for each row execute function public.proteger_campos_aluno();

-- coroa ("postura de rei") na ala: liga e desliga a do próprio aluno, em qualquer post
create or replace function public.alternar_coroa(post uuid) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare eu uuid := public.meu_aluno_id(); r uuid[];
begin
  if eu is null then raise exception 'Sem aluno vinculado'; end if;
  update public.ala set reis = case when eu = any(reis) then array_remove(reis, eu) else array_append(reis, eu) end
   where id = post returning reis into r;
  return r;
end $$;

-- ---------- RLS ----------
alter table public.perfis enable row level security;
alter table public.alunos enable row level security;
alter table public.execucoes enable row level security;
alter table public.ala enable row level security;
alter table public.config enable row level security;

create policy perfis_ler on public.perfis for select using (id = (select auth.uid()) or public.eh_treinador());

create policy alunos_ler on public.alunos for select using (user_id = (select auth.uid()) or public.eh_treinador());
create policy alunos_atualizar on public.alunos for update using (user_id = (select auth.uid()) or public.eh_treinador()) with check (user_id = (select auth.uid()) or public.eh_treinador());
create policy alunos_criar on public.alunos for insert with check (public.eh_treinador());
create policy alunos_apagar on public.alunos for delete using (public.eh_treinador());

create policy exec_ler on public.execucoes for select using (aluno_id = public.meu_aluno_id() or public.eh_treinador());
create policy exec_criar on public.execucoes for insert with check (aluno_id = public.meu_aluno_id() or public.eh_treinador());
create policy exec_responder on public.execucoes for update using (public.eh_treinador()) with check (public.eh_treinador());

create policy ala_ler on public.ala for select using ((select auth.uid()) is not null);
create policy ala_criar on public.ala for insert with check ((tipo = 'treino' and aluno_id = public.meu_aluno_id()) or public.eh_treinador());
create policy ala_editar on public.ala for update using (public.eh_treinador());
create policy ala_apagar on public.ala for delete using (public.eh_treinador() or aluno_id = public.meu_aluno_id());

create policy config_ler on public.config for select using ((select auth.uid()) is not null);
create policy config_escrever on public.config for all using (public.eh_treinador()) with check (public.eh_treinador());

revoke execute on function public.alternar_coroa(uuid) from anon, public;
grant execute on function public.alternar_coroa(uuid) to authenticated;

-- ---------- Storage: vídeos de execução e fotos de laudo ----------
insert into storage.buckets (id, name, public) values ('execucoes', 'execucoes', false) on conflict (id) do nothing;

create policy storage_exec_ler on storage.objects for select
  using (bucket_id = 'execucoes' and ((storage.foldername(name))[1] = public.meu_aluno_id()::text or public.eh_treinador()));
create policy storage_exec_enviar on storage.objects for insert
  with check (bucket_id = 'execucoes' and ((storage.foldername(name))[1] = public.meu_aluno_id()::text or public.eh_treinador()));
