# FORMA

FORMA é uma aplicação web de registo de treinos, pensada primeiro para o telemóvel. É necessária uma conta para guardar e sincronizar os treinos na tua instância Supabase.

## Estrutura

- `index.html` — ponto de entrada, cabeçalho e navegação.
- `src/app.js` — inicialização, eventos e fluxo entre ecrãs.
- `src/data.js` — catálogo de exercícios, dados do treino e leitura/escrita dos dados privados no Supabase.
- `src/supabase.js` — cliente Supabase configurado através de variáveis de ambiente.
- `src/views/auth.js` — criação de conta e início de sessão.
- `src/utils.js` — formatação de valores e cálculos partilhados.
- `src/views/` — um módulo por ecrã: início, treino, evolução, agenda, predefinições e perfil.
- `src/views/calendar.js` — calendário mensal reutilizado no histórico e na agenda.
- `src/views/schedule.js` — planeamento semanal recorrente e início rápido da sessão do dia.
- `src/views/templates.js` — seleção e edição das predefinições de treino.
- `supabase/functions/delete-account/` — eliminação autenticada de contas pelo Supabase Edge Functions.
- `styles/main.css` — ponto de entrada dos estilos.
- `styles/base.css`, `styles/components.css`, `styles/workout.css`, `styles/progress.css`, `styles/templates.css` e `styles/responsive.css` — estilos organizados por responsabilidade.

## Tecnologias

- HTML semântico, CSS e JavaScript nativo (ES2020+).
- Supabase Auth para contas por email e palavra-passe.
- Supabase Database com políticas RLS para separar e proteger os dados de cada conta.
- SVG para ícones, sem bibliotecas de interface.
- Google Fonts (DM Sans e Manrope) como melhoria tipográfica opcional; o sistema usa tipos alternativos se estiver offline.

## Executar

1. Instala as dependências com `npm install`.
2. Copia `.env.example` para `.env.local` e preenche a URL do projeto Supabase e a chave pública `anon`/`publishable` (nunca uses uma `service_role` no browser).
3. Executa o SQL de `supabase/schema.sql` no SQL Editor do teu projeto Supabase. Se já configuraste a base de dados, volta a executar o ficheiro para ativar a política que permite apagar os dados da própria conta.
4. Para disponibilizar a eliminação permanente de contas, instala e autentica o Supabase CLI, associa a pasta ao projeto (`supabase link`) e publica a função com `supabase functions deploy delete-account`. A função valida a sessão e usa `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor Supabase; nunca coloques essa chave no `.env.local`, na Vercel ou no frontend.
5. Inicia a aplicação com `npm run dev` e abre o endereço local apresentado pelo Vite.

Ativa Email/Password em **Authentication → Providers** no Supabase. Se a confirmação de email estiver ligada, confirma o endereço antes de iniciar sessão. Os dados locais existentes são migrados para a primeira conta que iniciar sessão neste navegador, apenas quando essa conta ainda não tem dados remotos.

## O que está implementado

- Início e continuação de um treino de corpo inteiro com quatro exercícios.
- Criação, edição e remoção de predefinições com exercícios do catálogo ou exercícios personalizados.
- Catálogo pessoal de exercícios: ao guardar um treino, os exercícios personalizados ficam disponíveis nas predefinições seguintes.
- Séries, repetições alvo e pesos iniciais configuráveis em cada exercício; iniciar uma sessão a partir da predefinição escolhida.
- Calendário do histórico com detalhe das séries, pesos e repetições por dia.
- Planeamento semanal recorrente, com uma predefinição por dia e início rápido do treino do dia.
- Sugestão automática do peso e das repetições do registo anterior do mesmo exercício, mesmo quando pertence a outra predefinição; a comparação normaliza maiúsculas, minúsculas e espaços no nome.
- Recuperação de um treino em curso após atualizar a página ou fechar e reabrir o separador.
- Visualização do exercício atual, objetivo de séries/repetições e registos da sessão anterior.
- Campos de peso e repetições pré-preenchidos com os valores da predefinição escolhida e validados em cada série.
- Registo de séries, descanso cronometrado de 90 segundos com opção para avançar e passagem para o exercício seguinte.
- Conclusão, resumo e histórico persistente dos treinos.
- Resumo final com exercícios realizados e duração, sem métricas agregadas de séries ou carga.
- Feedback visual de evolução ao superar a carga ou as repetições da última sessão real do mesmo exercício.
- Registo e início de sessão por email e palavra-passe, com sincronização da conta e separação dos dados por utilizador.
- Contas novas começam sem sessões de demonstração nem predefinições; o perfil permite remover exemplos antigos, apagar os dados de treino mantendo a conta ou eliminar permanentemente a conta e os dados associados.
- Estados vazios, feedback de sucesso/erro, confirmação de término e layout responsivo com navegação adaptada a uma mão.

## Preparado para a próxima fase

A próxima fase pode acrescentar notificações de lembrete e uma biblioteca de exercícios reutilizável entre predefinições. As predefinições, plano semanal, histórico e treino em curso são guardados na tabela privada `user_training_state`, protegida por Row Level Security. Agendamentos guardados anteriormente por data são convertidos automaticamente para o dia da semana correspondente.
