import { EXERCISE_MAP, ICONS, findPreviousWorkout } from '../data.js';
import { escapeHtml, formatDate, formatTime, elapsedSeconds, countCompletedSets, countWorkoutSets } from '../utils.js';

export function renderWorkout({ app, state, errorBanner, startClock }) {
  const workout = state.activeWorkout;
  if (!workout) return;

  if (workout.finished) {
    const duration = Math.max(1, Math.round(elapsedSeconds(workout) / 60));
    const completedExercises = workout.exercises.filter((exercise) =>
      exercise.sets.some((set) => set.complete)).length;
    app.innerHTML = `<section class="finish-screen">
      <div class="finish-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></div>
      <span class="eyebrow">Treino concluído</span>
      <h1>Fizeste por ti.</h1>
      <p>Bom trabalho. O teu esforço ficou registado e já faz parte da tua evolução.</p>
      <div class="finish-stats">
        <div class="finish-stat"><strong>${completedExercises}</strong><span>${completedExercises === 1 ? 'exercício realizado' : 'exercícios realizados'}</span></div>
        <div class="finish-stat"><strong>${duration} min</strong><span>tempo de treino</span></div>
      </div>
      <button class="primary-button" data-action="save-finished">Guardar treino</button>
    </section>`;
    return;
  }

  const exercise = workout.exercises[workout.exerciseIndex];
  const detail = { ...(EXERCISE_MAP[exercise.id] || {}), ...exercise };
  const previous = findPreviousWorkout(state.history.filter((item) => !item.isDemo), exercise.id, exercise.name)
    || findPreviousWorkout(state.history, exercise.id, exercise.name);
  const normalizedName = exercise.name.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ');
  const previousEntry = previous?.exercises.find((item) => item.id === exercise.id
    || item.name?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName);
  const completeCount = exercise.sets.filter((set) => set.complete).length;
  const overallComplete = countCompletedSets(workout);
  const overallTotal = countWorkoutSets(workout);
  const nextOpenSet = exercise.sets.findIndex((set) => !set.complete);
  const isResting = Boolean(workout.restEndsAt);
  const isExerciseDone = nextOpenSet < 0;
  const isLastExercise = workout.exerciseIndex === workout.exercises.length - 1;
  const nextAction = isLastExercise ? 'Terminar treino' : 'Próximo exercício';
  const restActionLabel = isExerciseDone ? nextAction : `Próxima série ${nextOpenSet + 1}`;
  const primaryLabel = isExerciseDone ? nextAction : `Concluir série ${nextOpenSet + 1}`;
  const previousSets = previousEntry?.sets || [];
  const workoutProgress = Math.round(overallComplete / overallTotal * 100);

  app.innerHTML = `<section class="workout-page">
    ${errorBanner()}
    <header class="workout-header">
      <div><span class="eyebrow">${escapeHtml(workout.name)}</span><h1>O teu treino</h1></div>
      <div class="workout-clock"><span class="workout-time" id="workout-time">${formatTime(elapsedSeconds(workout))}</span><br><button class="quiet-button workout-end-top" data-action="end-early">Terminar</button></div>
    </header>
    <div class="progress-track" role="progressbar" aria-label="Progresso do treino" aria-valuenow="${workoutProgress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${workoutProgress}%"></span></div>
    <div class="exercise-heading">
      <span class="exercise-icon">${ICONS[detail.icon] || ICONS.default}</span>
      <div><h2>${escapeHtml(detail.name)}</h2><p>${escapeHtml(detail.detail)} · ${exercise.sets.length} × ${detail.reps} alvo</p></div>
      <span class="exercise-count">${workout.exerciseIndex + 1}<span class="exercise-count-total"> / ${workout.exercises.length}</span></span>
    </div>
    <div class="previous-card">
      <div class="previous-heading">
        <div><div class="previous-label">Da última vez${previous?.isDemo ? ' · exemplo' : ''}</div>
          <div class="previous-date">${previousEntry ? formatDate(previous.date, { day: 'numeric', month: 'short' }) : 'Sem sessão anterior'}</div></div>
        ${previousEntry ? '<span class="previous-tag">POR SÉRIE</span>' : ''}
      </div>
      ${previousEntry ? `<div class="previous-sets">${previousSets.map((set, index) => `
        <div class="previous-set">
          <span class="previous-set-number">Série ${index + 1}</span>
          <strong>${escapeHtml(set.weight)} <small>kg</small></strong>
          <span class="previous-reps">${escapeHtml(set.reps)} <small>reps</small></span>
        </div>`).join('')}</div>`
        : '<p class="previous-empty">Ainda sem histórico. Regista esta sessão para veres os valores por série na próxima vez.</p>'}
    </div>
    <div class="sets-label"><h3>Séries</h3><span>${completeCount} de ${exercise.sets.length} concluídas</span></div>
    <div class="set-list">${exercise.sets.map((set, index) => `
      <div class="set-row ${set.complete ? 'is-complete' : ''}" data-set-row="${index}">
        <span class="set-number">${set.complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
        <div class="set-field"><label for="weight-${index}">Peso · kg</label><input id="weight-${index}" data-field="weight" data-index="${index}" type="number" inputmode="decimal" min="0" max="999" step="0.5" value="${escapeHtml(set.weight)}" ${set.complete ? 'disabled' : ''} aria-label="Peso da série ${index + 1}, em quilogramas"></div>
        <div class="set-field"><label for="reps-${index}">Repetições</label><input id="reps-${index}" data-field="reps" data-index="${index}" type="number" inputmode="numeric" min="1" max="999" step="1" value="${escapeHtml(set.reps)}" ${set.complete ? 'disabled' : ''} aria-label="Repetições da série ${index + 1}"></div>
        <span class="set-check" aria-label="${set.complete ? 'Série concluída' : 'Por fazer'}">${set.complete ? '✓' : '·'}</span>
      </div>`).join('')}</div>
    ${isResting ? `<section class="rest-card" aria-live="polite">
      <div class="rest-caption">Descansa. O teu próximo esforço espera.</div><div class="rest-clock" id="rest-clock">${formatTime(Math.max(0, Math.ceil((workout.restEndsAt - Date.now()) / 1000)))}</div>
      <button class="primary-button" data-action="continue-after-rest">${restActionLabel}</button>
      <button class="quiet-button" data-action="skip-rest">Saltar descanso</button>
    </section>` : ''}
    <div class="workout-sticky">
      <button class="primary-button" data-action="workout-primary" ${isResting ? 'disabled' : ''}>
        ${primaryLabel}
        <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
      </button>
      <button class="quiet-button" data-action="end-early">Guardar e terminar treino</button>
    </div>
  </section>`;
  startClock();
}
