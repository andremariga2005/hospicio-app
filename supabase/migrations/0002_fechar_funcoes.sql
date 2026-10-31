revoke execute on function public.eh_treinador() from anon, public;
revoke execute on function public.meu_aluno_id() from anon, public;
revoke execute on function public.proteger_campos_aluno() from anon, authenticated, public;
grant execute on function public.eh_treinador() to authenticated;
grant execute on function public.meu_aluno_id() to authenticated;
