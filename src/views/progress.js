import { dateFromKey, dateKey, escapeHtml, formatDate } from '../utils.js';
import { renderCalendar } from './calendar.js';

function historyMarkers(history) {
  const markers = new Map();
  history.forEach((workout) => {
    const key = dateKey(new Date(workout.date));
    const current = markers.get(key) || [];
    const type = workout.isDemo ? 'demo' : 'history';
    if (!current.includes(type)) current.push(type);
    markers.set(key, current);
  });
  return markers;
}

function renderSession(workout) {
  return `<article class="day-session">
    <div class="day-session-heading">
      <div><h3>${escapeHtml(workout.name)}${workout.isDemo ? ' <span class="previous-tag">EXEMPLO</span>' : ''}</h3>
        <span>${workout.duration || 0} min · ${workout.exercises.filter((exercise) => exercise.sets.length).length} exercícios</span></div>
    </div>
    <div class="day-session-exercises">${workout.exercises.map((exercise) => `
      <div class="day-exercise">
        <div><strong>${escapeHtml(exercise.name || exercise.id)}</strong><span>${exercise.sets.length} ${exercise.sets.length === 1 ? 'série' : 'séries'}</span></div>
        <ul>${exercise.sets.map((set, index) => `<li><span>Série ${index + 1}</span><span>${set.weight} kg × ${set.reps}</span></li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </article>`;
}

export function renderProgress({ app, state, errorBanner, selectedHistoryDate, historyMonth }) {
  const selectedWorkouts = state.history
    .filter((workout) => dateKey(new Date(workout.date)) === selectedHistoryDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const ownWorkouts = state.history.filter((workout) => !workout.isDemo);

  app.innerHTML = `<section class="progress-page">
    ${errorBanner()}
    <div class="progress-title-row">
      <div><span class="eyebrow">O teu percurso, dia a dia</span><h1 class="progress-title">Calendário de treinos</h1><p class="page-subtitle">Escolhe um dia marcado para rever os exercícios, pesos e repetições.</p></div>
    </div>
    <div class="history-calendar-layout">
      ${renderCalendar({ month: historyMonth, selectedDate: selectedHistoryDate, markedDates: historyMarkers(state.history), label: 'Calendário de treinos concluídos', kind: 'history' })}
      <section class="day-details">
        <div class="day-details-heading">
          <div><span class="eyebrow">Dia selecionado</span><h2>${formatDate(dateFromKey(selectedHistoryDate), { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div>
          <span class="day-count">${selectedWorkouts.length} ${selectedWorkouts.length === 1 ? 'treino' : 'treinos'}</span>
        </div>
        ${selectedWorkouts.length
          ? `<div class="day-session-list">${selectedWorkouts.map(renderSession).join('')}</div>`
          : '<div class="empty-state"><strong>Sem treinos neste dia.</strong>Seleciona outro dia assinalado no calendário para explorar o histórico.</div>'}
      </section>
    </div>
    <section class="progress-stats history-summary">
      <article class="stat-card"><div class="stat-label">Treinos concluídos</div><div class="stat-value">${ownWorkouts.length}</div></article>
      <article class="stat-card"><div class="stat-label">Dias com treino</div><div class="stat-value">${new Set(ownWorkouts.map((workout) => dateKey(new Date(workout.date)))).size}</div></article>
    </section>
    ${state.history.some((workout) => workout.isDemo) ? '<p class="demo-note demo-note-progress">As sessões de exemplo também aparecem no calendário e estão identificadas no detalhe.</p>' : ''}
  </section>`;
}
