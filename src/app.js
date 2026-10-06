import { REST_SECONDS, PROGRAM, EXERCISE_MAP, createWorkout, loadState, persistState } from './data.js';
import { countCompletedSets, dateFromKey, dateKey, elapsedSeconds, escapeHtml, formatTime } from './utils.js';
import { renderHome } from './views/home.js';
import { renderWorkout } from './views/workout.js';
import { renderProgress } from './views/progress.js';
import { renderProfile } from './views/profile.js';
import { renderTemplates } from './views/templates.js';
import { renderSchedule } from './views/schedule.js';

const elements = {
  app: document.querySelector('#app'),
  modalRoot: document.querySelector('#modal-root'),
  toast: document.querySelector('#toast'),
  todayLabel: document.querySelector('#today-label')
};

const state = loadState();
let activeTab = 'home';
let editingTemplate = null;
let selectedHistoryDate = state.history[0] ? dateKey(new Date(state.history[0].date)) : dateKey();
let historyMonth = new Date(dateFromKey(selectedHistoryDate).getFullYear(), dateFromKey(selectedHistoryDate).getMonth(), 1, 12);
let toastTimeout;
let clockInterval;

elements.todayLabel.textContent = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
}).format(new Date());

function showToast(message, kind = '') {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('is-progress', kind === 'progress');
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('is-visible', 'is-progress');
  }, kind === 'progress' ? 3600 : 2600);
}

function startTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) {
    showToast('Este treino já não está disponível.');
    return;
  }
  if (state.activeWorkout) {
    showToast('Termina ou retoma o treino em curso antes de começar outro.');
    return;
  }
  state.activeWorkout = createWorkout(state.history, template);
  saveState();
  activeTab = 'workout';
  render();
}

function moveCalendarMonth(direction) {
  const next = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + direction, 1, 12);
  historyMonth = next;
  selectedHistoryDate = dateKey(next);
  render();
}

function goToCalendarToday() {
  const today = new Date();
  const key = dateKey(today);
  selectedHistoryDate = key;
  historyMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  render();
}

function selectCalendarDate(key) {
  if (activeTab === 'progress') {
    selectedHistoryDate = key;
    const selected = dateFromKey(key);
    historyMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
  }
  render();
}

function saveWeeklySchedule(form) {
  const selections = Array.from({ length: 7 }, (_, weekday) => ({
    id: `schedule-${weekday}`,
    weekday,
    templateId: form.elements.namedItem(`weekday-${weekday}`).value
  })).filter((item) => item.templateId);
  if (selections.some((item) => !state.templates.some((template) => template.id === item.templateId))) {
    showToast('Uma das predefinições selecionadas já não está disponível.');
    return;
  }
  state.schedule = selections;
  const saved = saveState();
  render();
  if (saved) showToast('A tua semana de treinos foi guardada.');
}

function saveState() {
  try {
    persistState(state);
    state.storageError = false;
    return true;
  } catch (error) {
    console.error('Não foi possível guardar o treino.', error);
    state.storageError = true;
    showToast('Não foi possível guardar. Verifica o espaço disponível no dispositivo.');
    return false;
  }
}

function errorBanner() {
  return state.storageError
    ? '<div class="error-banner" role="alert">O armazenamento não está disponível neste momento. Os novos dados podem não ficar guardados. <button data-action="retry-save">Tentar novamente</button></div>'
    : '';
}

function activeExercise() {
  return state.activeWorkout?.exercises[state.activeWorkout.exerciseIndex];
}

function startClock() {
  clearInterval(clockInterval);
  if (activeTab !== 'workout' || !state.activeWorkout || state.activeWorkout.finished) return;

  clockInterval = setInterval(() => {
    const timer = document.querySelector('#workout-time');
    if (timer) timer.textContent = formatTime(elapsedSeconds(state.activeWorkout));

    const rest = document.querySelector('#rest-clock');
    if (!rest || !state.activeWorkout.restEndsAt) return;

    const remaining = Math.max(0, Math.ceil((state.activeWorkout.restEndsAt - Date.now()) / 1000));
    rest.textContent = formatTime(remaining);
    if (remaining === 0) {
      state.activeWorkout.restEndsAt = null;
      saveState();
      render();
    }
  }, 1000);
}

function readTemplateDraft() {
  const form = elements.app.querySelector('[data-template-form]');
  if (!form) return null;
  const name = form.elements.namedItem('template-name').value.trim();
  const exercises = [...form.querySelectorAll('[data-exercise-row]')].map((row) => {
    const select = row.querySelector('[data-exercise-id]');
    const selectedId = select.value;
    const custom = selectedId === '__custom__';
    const base = EXERCISE_MAP[selectedId];
    const customName = row.querySelector('[data-custom-name]')?.value.trim() || '';
    return {
      id: custom ? (select.dataset.customId || `custom-${crypto.randomUUID()}`) : selectedId,
      name: custom ? customName : base.name,
      detail: custom ? 'Exercício personalizado' : base.detail,
      icon: custom ? 'default' : base.icon,
      sets: Number(row.querySelector('[data-setting="sets"]').value),
      reps: Number(row.querySelector('[data-setting="reps"]').value),
      weight: Number(row.querySelector('[data-setting="weight"]').value)
    };
  });
  return { id: editingTemplate?.id || `template-${crypto.randomUUID()}`, name, exercises };
}

function makeBlankTemplate() {
  return { id: null, name: '', exercises: [{ ...PROGRAM[0] }] };
}

function saveTemplate() {
  const form = elements.app.querySelector('[data-template-form]');
  if (!form.reportValidity()) return;
  const template = readTemplateDraft();
  if (!template.name) {
    showToast('Escreve um nome para este treino.');
    form.elements.namedItem('template-name').focus();
    return;
  }
  for (const exercise of template.exercises) {
    if (!exercise.name) {
      showToast('Indica o nome de cada exercício personalizado.');
      return;
    }
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 20
      || !Number.isInteger(exercise.reps) || exercise.reps < 1 || exercise.reps > 999
      || !Number.isFinite(exercise.weight) || exercise.weight < 0 || exercise.weight > 999) {
      showToast('Confere séries, repetições e peso inicial de cada exercício.');
      return;
    }
  }
  const duplicate = state.templates.some((item) => item.name.toLocaleLowerCase() === template.name.toLocaleLowerCase() && item.id !== template.id);
  if (duplicate) {
    showToast('Já existe um treino com esse nome.');
    return;
  }
  const currentIndex = state.templates.findIndex((item) => item.id === template.id);
  if (currentIndex < 0) state.templates.push(template);
  else state.templates[currentIndex] = template;
  editingTemplate = null;
  saveState();
  render();
  showToast('Predefinição guardada.');
}

function render() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.action === activeTab
      || (activeTab === 'workout' && button.dataset.action === 'home')
      || (activeTab === 'profile' && button.dataset.action === 'home');
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const context = { app: elements.app, state, errorBanner, startClock };
  if (activeTab === 'workout' && state.activeWorkout) renderWorkout(context);
  else if (activeTab === 'progress') renderProgress({ ...context, selectedHistoryDate, historyMonth });
  else if (activeTab === 'templates') renderTemplates({ ...context, editingTemplate });
  else if (activeTab === 'schedule') renderSchedule(context);
  else if (activeTab === 'profile') renderProfile(context);
  else {
    activeTab = 'home';
    renderHome(context);
  }
  if (activeTab !== 'workout') clearInterval(clockInterval);
}

function showModal(title, message, confirmLabel, onConfirm) {
  elements.modalRoot.innerHTML = `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>
    <div class="modal-actions"><button class="secondary-button" data-action="dismiss-modal">Voltar</button><button class="primary-button" data-action="confirm-modal">${escapeHtml(confirmLabel)}</button></div>
  </section></div>`;
  elements.modalRoot.querySelector('[data-action="confirm-modal"]').addEventListener('click', () => {
    elements.modalRoot.innerHTML = '';
    onConfirm();
  });
  elements.modalRoot.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) elements.modalRoot.innerHTML = '';
  });
}

function finishWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;

  const exercises = workout.exercises
    .filter((exercise) => exercise.sets.some((set) => set.complete))
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      detail: exercise.detail,
      icon: exercise.icon,
      sets: exercise.sets.filter((set) => set.complete)
        .map(({ weight, reps }) => ({ weight: Number(weight), reps: Number(reps) }))
    }));
  const completedCount = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  if (completedCount === 0) {
    state.activeWorkout = null;
    saveState();
    activeTab = 'home';
    render();
    showToast('Treino cancelado. Ainda não havia séries registadas.');
    return;
  }

  state.history.unshift({
    id: workout.id,
    name: workout.name,
    date: new Date().toISOString(),
    duration: Math.max(1, Math.round(elapsedSeconds(workout) / 60)),
    sets: completedCount,
    exercises,
    isDemo: false
  });
  workout.finished = true;
  workout.restEndsAt = null;
  saveState();
  activeTab = 'workout';
  render();
}

function saveCurrentSet() {
  const workout = state.activeWorkout;
  const exercise = activeExercise();
  if (!workout || !exercise) return;

  const index = exercise.sets.findIndex((set) => !set.complete);
  if (index < 0) return;

  const weightInput = document.querySelector(`#weight-${index}`);
  const repsInput = document.querySelector(`#reps-${index}`);
  const weight = Number(weightInput?.value);
  const reps = Number(repsInput?.value);

  if (!Number.isFinite(weight) || weight < 0 || weight > 999) {
    showToast('Introduz um peso válido entre 0 e 999 kg.');
    weightInput?.focus();
    return;
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 999) {
    showToast('Introduz um número de repetições entre 1 e 999.');
    repsInput?.focus();
    return;
  }

  const normalizedName = exercise.name.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ');
  const previousWorkout = state.history
    .filter((item) => !item.isDemo)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((item) => item.exercises?.some((entry) =>
      entry.id === exercise.id
      || entry.name?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName));
  const previousExercise = previousWorkout?.exercises.find((entry) =>
    entry.id === exercise.id
    || entry.name?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName);
  const previousSets = previousExercise?.sets || [];
  const previousSet = previousSets[index] || previousSets[previousSets.length - 1];
  const improved = [];
  if (previousSet && weight > Number(previousSet.weight)) {
    improved.push(`mais carga (${weight} kg vs. ${previousSet.weight} kg)`);
  }
  if (previousSet && weight === Number(previousSet.weight) && reps > Number(previousSet.reps)) {
    improved.push(`mais repetições (${reps} vs. ${previousSet.reps}) com o mesmo peso`);
  }
  exercise.sets[index] = { weight, reps, complete: true };
  const lastSetOfWorkout = workout.exerciseIndex === workout.exercises.length - 1
    && index === exercise.sets.length - 1;
  if (!lastSetOfWorkout) workout.restEndsAt = Date.now() + REST_SECONDS * 1000;

  const saved = saveState();
  render();
  if (!saved) return;
  if (improved.length) {
    showToast(`🏆 Parabéns! Série ${index + 1}: ${improved.join(' e ')} face à última vez.`, 'progress');
  } else {
    showToast(lastSetOfWorkout ? 'Série registada. Treino concluído.' : 'Série registada. Bom descanso.');
  }
}

function advanceWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;

  const exercise = activeExercise();
  if (!exercise.sets.every((set) => set.complete)) {
    showToast('Regista a série antes de avançar.');
    return;
  }

  workout.restEndsAt = null;
  if (workout.exerciseIndex < workout.exercises.length - 1) {
    workout.exerciseIndex += 1;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  finishWorkout();
}

function leaveRest(skipRest) {
  if (!state.activeWorkout) return;
  const exerciseIsDone = activeExercise().sets.every((set) => set.complete);
  if (exerciseIsDone) advanceWorkout();
  else {
    state.activeWorkout.restEndsAt = null;
    saveState();
    render();
  }
  if (skipRest) {
    showToast(exerciseIsDone ? 'Descanso terminado. Próximo exercício.' : 'Descanso terminado. A próxima série é tua.');
  }
}

elements.app.addEventListener('input', (event) => {
  const input = event.target.closest('[data-field]');
  if (!input || !state.activeWorkout) return;
  const set = activeExercise()?.sets[Number(input.dataset.index)];
  if (!set || set.complete) return;
  set[input.dataset.field] = input.value;
  saveState();
});

elements.app.addEventListener('change', (event) => {
  if (event.target.matches('[data-exercise-id]')) {
    const draft = readTemplateDraft();
    const rowIndex = [...elements.app.querySelectorAll('[data-exercise-row]')].indexOf(event.target.closest('[data-exercise-row]'));
    if (draft && rowIndex >= 0) {
      const row = draft.exercises[rowIndex];
      if (event.target.value === '__custom__') {
        row.id = `custom-${crypto.randomUUID()}`;
        row.name = '';
        row.detail = 'Exercício personalizado';
        row.icon = 'default';
      } else {
        Object.assign(row, EXERCISE_MAP[event.target.value]);
      }
      editingTemplate = { ...draft, exercises: draft.exercises };
      render();
    }
  }
});

elements.app.addEventListener('submit', (event) => {
  if (event.target.matches('[data-template-form]')) {
    event.preventDefault();
    saveTemplate();
  } else if (event.target.matches('[data-schedule-form]')) {
    event.preventDefault();
    saveWeeklySchedule(event.target);
  }
});

document.addEventListener('click', (event) => {
  const calendarDay = event.target.closest('[data-calendar-date]');
  if (calendarDay) {
    selectCalendarDate(calendarDay.dataset.calendarDate);
    return;
  }
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;

  const action = actionElement.dataset.action;
  if (action === 'home') {
    activeTab = 'home';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'progress') {
    activeTab = 'progress';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'schedule') {
    activeTab = 'schedule';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'profile') {
    activeTab = 'profile';
    render();
  } else if (action === 'templates') {
    activeTab = 'templates';
    editingTemplate = null;
    render();
  } else if (action === 'start-workout') {
    activeTab = 'templates';
    render();
  } else if (action === 'start-template') {
    startTemplate(actionElement.dataset.templateId);
  } else if (action === 'start-scheduled') {
    const scheduled = state.schedule.find((item) => item.id === actionElement.dataset.scheduleId);
    if (!scheduled) {
      showToast('Este treino já não está na agenda.');
      return;
    }
    startTemplate(scheduled.templateId);
  } else if (action === 'calendar-previous') {
    moveCalendarMonth(-1);
  } else if (action === 'calendar-next') {
    moveCalendarMonth(1);
  } else if (action === 'calendar-today') {
    goToCalendarToday();
  } else if (action === 'new-template') {
    editingTemplate = makeBlankTemplate();
    activeTab = 'templates';
    render();
    elements.app.querySelector('[name="template-name"]')?.focus();
  } else if (action === 'edit-template') {
    const template = state.templates.find((item) => item.id === actionElement.dataset.templateId);
    if (template) {
      editingTemplate = structuredClone(template);
      activeTab = 'templates';
      render();
    }
  } else if (action === 'cancel-template-edit') {
    editingTemplate = null;
    render();
  } else if (action === 'add-template-exercise') {
    const draft = readTemplateDraft();
    if (draft) {
      const nextExercise = PROGRAM.find((exercise) => !draft.exercises.some((item) => item.id === exercise.id)) || { ...PROGRAM[0] };
      editingTemplate = { ...draft, exercises: [...draft.exercises, { ...nextExercise }] };
      render();
    }
  } else if (action === 'remove-template-exercise') {
    const draft = readTemplateDraft();
    const index = [...elements.app.querySelectorAll('[data-exercise-row]')].indexOf(actionElement.closest('[data-exercise-row]'));
    if (draft && draft.exercises.length > 1) {
      draft.exercises.splice(index, 1);
      editingTemplate = draft;
      render();
    } else {
      showToast('Um treino precisa de pelo menos um exercício.');
    }
  } else if (action === 'delete-template') {
    const template = state.templates.find((item) => item.id === actionElement.dataset.templateId);
    if (template) showModal('Apagar predefinição?', `“${template.name}” e os respetivos agendamentos serão removidos. Os treinos já guardados não serão afetados.`, 'Apagar treino', () => {
      state.templates = state.templates.filter((item) => item.id !== template.id);
      state.schedule = state.schedule.filter((item) => item.templateId !== template.id);
      saveState();
      render();
      showToast('Predefinição apagada.');
    });
  } else if (action === 'resume-workout') {
    activeTab = 'workout';
    render();
  } else if (action === 'workout-primary') {
    const exercise = activeExercise();
    if (exercise?.sets.every((set) => set.complete)) advanceWorkout();
    else saveCurrentSet();
  } else if (action === 'continue-after-rest' || action === 'skip-rest') {
    leaveRest(action === 'skip-rest');
  } else if (action === 'end-early') {
    showModal('Terminar este treino?', 'As séries que já concluíste serão guardadas no histórico. Podes retomar o treino mais tarde apenas se escolheres voltar.', 'Guardar e terminar', finishWorkout);
  } else if (action === 'save-finished') {
    state.activeWorkout = null;
    saveState();
    activeTab = 'home';
    render();
    showToast('Treino guardado. Cada sessão conta.');
  } else if (action === 'clear-demo') {
    showModal('Remover dados de exemplo?', 'As sessões de demonstração serão removidas deste dispositivo. Os teus treinos registados ficam intactos.', 'Remover exemplos', () => {
      state.history = state.history.filter((workout) => !workout.isDemo);
      saveState();
      activeTab = 'profile';
      render();
      showToast('Dados de exemplo removidos.');
    });
  } else if (action === 'retry-save') {
    saveState();
    render();
    if (!state.storageError) showToast('Armazenamento disponível.');
  } else if (action === 'dismiss-modal') {
    elements.modalRoot.innerHTML = '';
  }
});

if (state.activeWorkout?.restEndsAt && state.activeWorkout.restEndsAt <= Date.now()) {
  state.activeWorkout.restEndsAt = null;
  saveState();
}
render();
