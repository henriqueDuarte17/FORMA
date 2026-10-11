import { EXERCISE_MAP, ICONS, findMatchingExercise, findPreviousWorkout } from '../data.js';
import { escapeHtml, formatDate, formatTime, elapsedSeconds, countCompletedSets, countWorkoutSets } from '../utils.js';

export function renderWorkout({ app, state, errorBanner, startClock, editingSetIndex }) {
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
  const previousEntry = previous ? findMatchingExercise(previous, exercise.id, exercise.name) : null;
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
  const availableExercises = [
    ...Object.values(EXERCISE_MAP),
    ...(state.exerciseCatalog || [])
  ].filter((item, index, exercises) =>
    exercises.findIndex((candidate) => candidate.id === item.id) === index
    && !workout.exercises.some((other, otherIndex) =>
      otherIndex < workout.exerciseIndex && other.id === item.id));

  app.innerHTML = `<section class="workout-page">
    ${errorBanner()}
    <header class="workout-header">
      <div><span class="eyebrow">${escapeHtml(workout.name)}</span><h1>O teu treino</h1></div>
      <div class="workout-clock"><span class="workout-time" id="workout-time">${formatTime(elapsedSeconds(workout))}</span><br><button class="quiet-button workout-end-top" data-action="end-early">Terminar</button></div>
    </header>
    <div class="progress-track" role="progressbar" aria-label="Progresso do treino" aria-valuenow="${workoutProgress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${workoutProgress}%"></span></div>
    <div class="exercise-heading">
      <span class="exercise-icon">${ICONS[detail.icon] || ICONS.default}</span>
      <div class="exercise-heading-main">
        <h2>${escapeHtml(detail.name)}</h2>
        <p>${escapeHtml(detail.detail)} · ${exercise.sets.length} × ${detail.reps} alvo</p>
        <label class="template-field workout-exercise-switch">Trocar exercício
          <select data-workout-exercise aria-label="Trocar exercício" ${completeCount ? 'disabled' : ''}>
            ${availableExercises.map((item) =>
              `<option value="${escapeHtml(item.id)}" ${item.id === exercise.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
            ).join('')}
          </select>
        </label>
        ${completeCount ? '<span class="workout-switch-hint">Só podes trocar antes de registar séries.</span>' : ''}
      </div>
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
        ${editingSetIndex === index
          ? '<span class="set-number">✎</span>'
          : `<span class="set-number">${set.complete ? '✓' : String(index + 1).padStart(2, '0')}</span>`}
        <div class="set-field"><label for="weight-${index}">Peso · kg</label><input id="weight-${index}" data-field="weight" data-index="${index}" type="number" inputmode="decimal" min="0" max="999" step="0.5" value="${escapeHtml(set.weight)}" ${set.complete && editingSetIndex !== index ? 'disabled' : ''} aria-label="Peso da série ${index + 1}, em quilogramas"></div>
        <div class="set-field"><label for="reps-${index}">Repetições</label><input id="reps-${index}" data-field="reps" data-index="${index}" type="number" inputmode="numeric" min="1" max="999" step="1" value="${escapeHtml(set.reps)}" ${set.complete && editingSetIndex !== index ? 'disabled' : ''} aria-label="Repetições da série ${index + 1}"></div>
        ${editingSetIndex === index
          ? `<div class="set-edit-actions"><button class="set-edit-button" data-action="save-edited-set" data-index="${index}">Guardar</button><button class="set-edit-button is-cancel" data-action="cancel-edit-set">Cancelar</button></div>`
          : set.complete
            ? `<button class="set-edit-button" data-action="edit-completed-set" data-index="${index}" aria-label="Editar série ${index + 1}">Editar</button>`
            : '<span class="set-check" aria-label="Por fazer">·</span>'}
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
