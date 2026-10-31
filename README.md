# Hospício · app da consultoria do Abel Colognese

App real (PWA) com dois lados:

- **Aluna** (`/app`): Hoje com a assistente diária, Prescrição (treino, dose do dia, volume por músculo, envio de execução), Rotina (dieta adaptativa, sono, peso), Ala e Prontuário.
- **Plantão do Abel** (`/plantao`): visão geral, fila 24 h, radar de desistência, diário, nutrição, alunos, laudos, renovações, funil, esteira, mercado e cadastro de alunas.

Stack: Vite + React + TypeScript, Supabase (banco, login, arquivos), funções da Vercel para a IA e para convites.

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencher
npm run dev
```

## Variáveis na Vercel

| Variável | O que é |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave pública (publishable) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta do Supabase (só servidor, usada para convidar alunas) |
| `PORTAL_URL` | endereço do app, ex. `https://hospicio-app.vercel.app` |
| `ANTHROPIC_API_KEY` | chave da API da Anthropic, da conta do Abel |
| `ANTHROPIC_MODEL` | opcional; padrão `claude-haiku-5-5` |

## Banco

A estrutura está em `supabase/migrations/0001_hospicio.sql` (tabelas, regras de acesso por aluna/treinador e o bucket `execucoes`).
