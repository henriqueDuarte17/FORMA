import { ICONS } from '../data.js';
import { escapeHtml, formatDate, countCompletedSets, countWorkoutSets, weekdayIndex } from '../utils.js';

export function renderHome({ app, state, errorBanner }) {
  const workouts = state.history.filter((item) => !item.isDemo);
  const newest = state.history[0];
  const completedSets = state.activeWorkout ? countCompletedSets(state.activeWorkout) : 0;
  const selectedTemplate = state.templates.find((template) => template.id === state.activeWorkout?.templateId)
    || state.templates[0];
  const scheduledToday = state.schedule.find((item) => item.weekday === weekdayIndex());
  const scheduledTemplate = state.templates.find((template) => template.id === scheduledToday?.templateId);
  const readyTemplate = state.activeWorkout ? null : scheduledTemplate || selectedTemplate;
  const totalSets = state.activeWorkout ? countWorkoutSets(state.activeWorkout) : 0;
  const workoutTemplate = state.templates.find((template) => template.id === state.activeWorkout?.templateId);
  const currentWorkoutName = state.activeWorkout?.name || workoutTemplate?.name;
  const activeExercises = state.activeWorkout
    ? state.activeWorkout.exercises.filter((exercise) => exercise.sets.some((set) => set.complete)).length
    : 0;
  const plannedExercises = readyTemplate?.exercises.length || 0;
  const templateDescription = readyTemplate
    ? `${readyTemplate.exercises.length} exercícios · ${readyTemplate.exercises.reduce((sum, exercise) => sum + Number(exercise.sets), 0)} séries`
    : 'Cria uma predefinição para começar';
  const heroAction = state.activeWorkout ? 'resume-workout' : scheduledToday ? 'start-scheduled' : 'templates';
  const heroLabel = state.activeWorkout ? 'Continuar treino' : scheduledToday ? 'Começar treino' : 'Escolher treino';
  const heroWorkoutName = state.activeWorkout
    ? currentWorkoutName
    : scheduledToday
      ? scheduledTemplate?.name
      : null;
  const recent = state.history.slice(0, 3);
  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return state.history.some((workout) =>
      !workout.isDemo && new Date(workout.date).toDateString() === date.toDateString());
  });

  app.innerHTML = `${errorBanner()}
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">${state.activeWorkout ? 'Treino em curso' : scheduledToday ? 'Treino planeado para hoje' : 'O teu espaço de treino'}</span>
        <h1>${state.activeWorkout ? 'Continua de onde ficaste.' : scheduledToday ? 'O teu treino de hoje está pronto.' : 'Um treino de cada vez. Mais forte a cada dia.'}</h1>
        <p>${heroWorkoutName
          ? `${state.activeWorkout ? 'Em curso' : 'Hoje'}: ${escapeHtml(heroWorkoutName)}${state.activeWorkout ? '. O teu progresso está guardado neste dispositivo.' : '.'}`
          : 'Sem treino planeado para hoje. Escolhe uma predefinição e começa ao teu ritmo.'}</p>
        <button class="primary-button" data-action="${heroAction}" ${scheduledToday && !state.activeWorkout ? `data-schedule-id="${escapeHtml(scheduledToday.id)}"` : ''}>
          ${heroLabel}
          <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
      </div>
    </section>

    <div class="section-heading"><h2>O teu ritmo</h2><button class="text-link" data-action="progress">Ver evolução</button></div>
    <section class="overview-grid">
      <article class="stat-card">
        <div class="stat-label"><span>Treinos concluídos</span><span class="streak-badge">${workouts.length ? '● em movimento' : '○ por começar'}</span></div>
        <div class="stat-value">${workouts.length}<span class="stat-unit"> sessões</span></div>
        <div class="week-dots" aria-label="Atividade da última semana">${activity.map((done) => `<span class="week-dot ${done ? 'is-done' : ''}"></span>`).join('')}</div>
      </article>
      <article class="stat-card">
        <div class="stat-label"><span>Último treino</span><span>◷</span></div>
        <div class="stat-value stat-value-small">${newest ? formatDate(newest.date, { day: 'numeric', month: 'short' }) : '—'}</div>
        <span class="stat-unit">${newest ? `${newest.duration || 0} min · ${escapeHtml(newest.name)}${newest.isDemo ? ' · Exemplo' : ''}` : 'O teu primeiro começa aqui'}</span>
      </article>
      <article class="stat-card">
        <div class="stat-label"><span>Exercícios de treino</span><span>↗</span></div>
        <div class="stat-value">${state.activeWorkout ? activeExercises : 0}<span class="stat-unit"> / ${state.activeWorkout ? state.activeWorkout.exercises.length : plannedExercises || '—'}</span></div>
        <span class="stat-unit">${state.activeWorkout ? 'Com pelo menos uma série registada' : readyTemplate ? 'Na predefinição selecionada' : 'Cria um treino para começar'}</span>
      </article>
    </section>

    <div class="section-heading"><h2>${state.activeWorkout ? 'Treino em curso' : scheduledToday ? 'Treino agendado para hoje' : readyTemplate ? 'Predefinição pronta' : 'Prepara o teu primeiro treino'}</h2><button class="text-link" data-action="schedule">Agenda</button></div>
    <section class="workout-summary">
      <div class="summary-info">
        <span class="summary-icon">${ICONS.default}</span>
        <div class="summary-copy">
          <strong>${escapeHtml(state.activeWorkout?.name || readyTemplate?.name || 'Sem treino definido')}</strong>
          <span>${state.activeWorkout ? `${state.activeWorkout.exercises.length} exercícios · ${totalSets} séries` : templateDescription}</span>
        </div>
      </div>
      ${state.activeWorkout
        ? `<div class="mini-progress" aria-label="Progresso do treino"><span style="width:${Math.round(completedSets / totalSets * 100)}%"></span></div>`
        : scheduledToday
          ? `<button class="primary-button home-start-scheduled" data-action="start-scheduled" data-schedule-id="${escapeHtml(scheduledToday.id)}">Começar treino</button>`
          : '<button class="icon-button" data-action="templates" aria-label="Escolher treino">›</button>'}
    </section>
    ${!state.activeWorkout && state.schedule.length ? `<button class="text-link home-agenda-link" data-action="schedule">Ver semana · ${state.schedule.length} ${state.schedule.length === 1 ? 'dia planeado' : 'dias planeados'}</button>` : ''}

    <div class="section-heading"><h2>Atividade recente</h2><button class="text-link" data-action="progress">Ver tudo</button></div>
    ${recent.length ? `<section class="history-list">${recent.map((workout) => `
      <article class="history-row">
        <div><div class="history-name">${escapeHtml(workout.name)}</div><div class="history-date">${formatDate(workout.date, { weekday: 'short', day: 'numeric', month: 'short' })}${workout.isDemo ? ' · Exemplo' : ''}</div></div>
        <div><div class="history-name history-name-right">${workout.duration || 0} min</div><div class="history-meta">${workout.sets || 0} séries</div></div>
      </article>`).join('')}</section>` : '<div class="empty-state"><strong>A tua história começa com a primeira série.</strong>Quando terminares o primeiro treino, vais encontrá-lo aqui.</div>'}
    ${state.history.some((workout) => workout.isDemo) ? '<p class="demo-note demo-note-home">As sessões marcadas como exemplo são apenas uma demonstração; substitui-as quando quiseres.</p>' : ''}`;
}
