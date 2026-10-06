# FORMA

FORMA é uma aplicação web de registo de treinos, pensada primeiro para o telemóvel. O MVP funciona inteiramente no navegador e não requer conta nem serviços externos.

## Estrutura

- `index.html` — ponto de entrada, cabeçalho e navegação.
- `src/app.js` — inicialização, eventos e fluxo entre ecrãs.
- `src/data.js` — plano, dados de exemplo e leitura/escrita do armazenamento local.
- `src/utils.js` — formatação de valores e cálculos partilhados.
- `src/views/` — um módulo por ecrã: início, treino, evolução, agenda, predefinições e perfil.
- `src/views/calendar.js` — calendário mensal reutilizado no histórico e na agenda.
- `src/views/schedule.js` — planeamento semanal recorrente e início rápido da sessão do dia.
- `src/views/templates.js` — seleção e edição das predefinições de treino.
- `styles/main.css` — ponto de entrada dos estilos.
- `styles/base.css`, `styles/components.css`, `styles/workout.css`, `styles/progress.css`, `styles/templates.css` e `styles/responsive.css` — estilos organizados por responsabilidade.

## Tecnologias

- HTML semântico, CSS e JavaScript nativo (ES2020+).
- `localStorage` para guardar treinos neste dispositivo.
- SVG para ícones, sem bibliotecas de interface.
- Google Fonts (DM Sans e Manrope) como melhoria tipográfica opcional; o sistema usa tipos alternativos se estiver offline.

## Executar

Como o projeto usa módulos JavaScript nativos, abre-o através de um servidor HTTP local, em vez de abrir o ficheiro diretamente como `file://`. No VS Code, instala/inicia a extensão Live Server e abre `index.html`; em alternativa, usa qualquer servidor estático local. Não é necessário instalar dependências nem compilar.

Os dados de exemplo são criados na primeira utilização e aparecem identificados como exemplos. Em **perfil**, podes removê-los sem afetar os treinos que registares. Os teus dados ficam apenas no armazenamento local desse navegador e dispositivo.

## O que está implementado

- Início e continuação de um treino de corpo inteiro com quatro exercícios.
- Criação, edição e remoção de predefinições com exercícios do catálogo ou exercícios personalizados.
- Séries, repetições alvo e pesos iniciais configuráveis em cada exercício; iniciar uma sessão a partir da predefinição escolhida.
- Calendário do histórico com detalhe das séries, pesos e repetições por dia.
- Planeamento semanal recorrente, com uma predefinição por dia e início rápido do treino do dia.
- Sugestão automática do peso e das repetições do registo anterior de cada exercício.
- Recuperação de um treino em curso após atualizar a página ou fechar e reabrir o separador.
- Visualização do exercício atual, objetivo de séries/repetições e registos da sessão anterior.
- Campos de peso e repetições pré-preenchidos com os valores da predefinição escolhida e validados em cada série.
- Registo de séries, descanso cronometrado de 90 segundos com opção para avançar e passagem para o exercício seguinte.
- Conclusão, resumo e histórico persistente dos treinos.
- Resumo final com exercícios realizados e duração, sem métricas agregadas de séries ou carga.
- Feedback visual de evolução ao superar a carga ou as repetições da última sessão real do mesmo exercício.
- Estados vazios, feedback de sucesso/erro, confirmação de término e layout responsivo com navegação adaptada a uma mão.

## Preparado para a próxima fase

A próxima fase pode acrescentar notificações de lembrete, uma biblioteca de exercícios reutilizável entre predefinições, autenticação e sincronização remota. As predefinições, plano semanal e histórico ficam guardados no navegador local, sem conta ou partilha entre dispositivos. Agendamentos guardados anteriormente por data são convertidos automaticamente para o dia da semana correspondente.
