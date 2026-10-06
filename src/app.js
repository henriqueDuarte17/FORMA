import { supabase, supabaseConfigured, supabaseConfigurationError } from './supabase.js';
import { REST_SECONDS, PROGRAM, EXERCISE_MAP, createWorkout, findMatchingExercise, loadState, persistState } from './data.js';
import { countCompletedSets, dateFromKey, dateKey, elapsedSeconds, escapeHtml, formatTime } from './utils.js';
import { renderHome } from './views/home.js';
import { renderWorkout } from './views/workout.js';
import { renderProgress } from './views/progress.js';
import { renderProfile } from './views/profile.js';
import { renderTemplates } from './views/templates.js';
import { renderSchedule } from './views/schedule.js';
import { renderAuth } from './views/auth.js';

const elements = {
  app: document.querySelector('#app'),
  modalRoot: document.querySelector('#modal-root'),
  toast: document.querySelector('#toast'),
  todayLabel: document.querySelector('#today-label')
};

let state = { history: [], activeWorkout: null, templates: [], exerciseCatalog: [], schedule: [], storageError: false };
let user = null;
let activeTab = 'home';
let editingTemplate = null;
let selectedHistoryDate = dateKey();
let historyMonth = new Date();
let authMode = 'login';
let authMessage = '';
let authMessageType = 'status';
let authSubmitting = false;
let persistenceQueue = Promise.resolve();
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

async function startTemplate(templateId) {
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
  await saveState();
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

async function saveWeeklySchedule(form) {
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
  const saved = await saveState();
  render();
  if (saved) showToast('A tua semana de treinos foi guardada.');
}

async function saveState() {
  if (!user) {
    state.storageError = true;
    showToast('Inicia sessão para guardar os teus treinos.');
    return false;
  }
  const snapshot = structuredClone(state);
  const userId = user.id;
  const pendingSave = persistenceQueue.then(() => persistState(snapshot, userId));
  persistenceQueue = pendingSave.catch(() => {});
  try {
    await pendingSave;
    state.storageError = false;
    return true;
  } catch (error) {
    console.error('Não foi possível guardar o treino.', error);
    state.storageError = true;
    showToast('Não foi possível guardar na nuvem.');
    return false;
  }
}

function errorBanner() {
  return state.storageError
    ? '<div class="error-banner" role="alert">O acesso ao Supabase falhou temporariamente. <button data-action="retry-save">Tentar novamente</button></div>'
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
    const isNewCustom = selectedId === '__custom__';
    const base = EXERCISE_MAP[selectedId] || state.exerciseCatalog.find((exercise) => exercise.id === selectedId);
    const customName = row.querySelector('[data-custom-name]')?.value.trim() || '';
    return {
      id: isNewCustom ? (select.dataset.customId || `custom-${crypto.randomUUID()}`) : selectedId,
      name: isNewCustom ? customName : base.name,
      detail: isNewCustom ? 'Exercício personalizado' : base.detail,
      icon: isNewCustom ? 'default' : base.icon,
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

async function saveTemplate() {
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
  const exerciseCatalog = state.exerciseCatalog || [];
  template.exercises = template.exercises.map((exercise) => {
    if (EXERCISE_MAP[exercise.id]) return exercise;
    const normalizedName = exercise.name.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ');
    const existing = exerciseCatalog.find((item) =>
      item.name.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName);
    if (existing) return { ...exercise, id: existing.id };
    const savedExercise = {
      id: exercise.id,
      name: exercise.name.trim().replace(/\s+/g, ' '),
      detail: exercise.detail || 'Exercício personalizado',
      icon: exercise.icon || 'default'
    };
    exerciseCatalog.push(savedExercise);
    return { ...exercise, ...savedExercise };
  });
  state.exerciseCatalog = exerciseCatalog;
  editingTemplate = null;
  const saved = await saveState();
  render();
  if (saved) showToast('Predefinição guardada.');
}

function render() {
  const navigation = document.querySelector('.bottom-nav');
  document.querySelector('.topbar-right').hidden = !user;
  navigation.hidden = !user;
  if (!user) {
    clearInterval(clockInterval);
    renderAuth({
      app: elements.app,
      mode: authMode,
      configured: supabaseConfigured,
      configurationError: supabaseConfigurationError,
      message: authMessage,
      messageType: authMessageType,
      submitting: authSubmitting
    });
    return;
  }
  const avatar = document.querySelector('.avatar-button');
  avatar.textContent = user.email?.trim().charAt(0).toLocaleUpperCase('pt-PT') || 'U';
  avatar.setAttribute('aria-label', `Conta de ${user.email || 'utilizador'}`);

  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.action === activeTab
      || (activeTab === 'workout' && button.dataset.action === 'home')
      || (activeTab === 'profile' && button.dataset.action === 'home');
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const context = { app: elements.app, state, errorBanner, startClock, user };
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

async function finishWorkout() {
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
    await saveState();
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
  await saveState();
  activeTab = 'workout';
  render();
}

async function saveCurrentSet() {
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

  const previousWorkout = state.history
    .filter((item) => !item.isDemo)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((item) => findMatchingExercise(item, exercise.id, exercise.name));
  const previousExercise = previousWorkout
    ? findMatchingExercise(previousWorkout, exercise.id, exercise.name)
    : null;
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

  const saved = await saveState();
  render();
  if (!saved) return;
  if (improved.length) {
    showToast(`🏆 Parabéns! Série ${index + 1}: ${improved.join(' e ')} face à última vez.`, 'progress');
  } else {
    showToast(lastSetOfWorkout ? 'Série registada. Treino concluído.' : 'Série registada. Bom descanso.');
  }
}

async function advanceWorkout() {
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
    await saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  await finishWorkout();
}

async function leaveRest(skipRest) {
  if (!state.activeWorkout) return;
  const exerciseIsDone = activeExercise().sets.every((set) => set.complete);
  if (exerciseIsDone) await advanceWorkout();
  else {
    state.activeWorkout.restEndsAt = null;
    await saveState();
    render();
  }
  if (skipRest) {
    showToast(exerciseIsDone ? 'Descanso terminado. Próximo exercício.' : 'Descanso terminado. A próxima série é tua.');
  }
}

async function activateUser(nextUser) {
  const nextState = await loadState(nextUser.id);
  state = nextState;
  user = nextUser;
  authMessage = '';
  authMessageType = 'status';
  authMode = 'login';
  activeTab = 'home';
  if (state.history[0]) {
    selectedHistoryDate = dateKey(new Date(state.history[0].date));
    const selectedDate = dateFromKey(selectedHistoryDate);
    historyMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
  }
  render();
}

async function submitAuth(form) {
  if (!supabase) {
    authMessage = supabaseConfigurationError || 'A ligação ao Supabase não está configurada.';
    authMessageType = 'error';
    render();
    return;
  }
  const mode = authMode;
  const email = form.elements.namedItem('email').value.trim();
  const password = form.elements.namedItem('password').value;
  authSubmitting = true;
  authMessage = '';
  authMessageType = 'status';
  render();
  try {
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session && data.user) {
        await activateUser(data.user);
      } else {
        authMessage = 'Conta criada. Confirma o endereço através do email que te enviámos e depois inicia sessão.';
        authMessageType = 'status';
        authMode = 'login';
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await activateUser(data.user);
    }
  } catch (error) {
    console.error('Não foi possível autenticar a conta.', error);
    authMessage = error.message
      ? `Não foi possível ${mode === 'signup' ? 'criar a conta' : 'iniciar sessão'}: ${error.message}`
      : 'Não foi possível autenticar. Verifica o email, a palavra-passe e a configuração do Supabase.';
    authMessageType = 'error';
  } finally {
    authSubmitting = false;
    if (!user) render();
  }
}

elements.app.addEventListener('input', async (event) => {
  const input = event.target.closest('[data-field]');
  if (!input || !state.activeWorkout) return;
  const set = activeExercise()?.sets[Number(input.dataset.index)];
  if (!set || set.complete) return;
  set[input.dataset.field] = input.value;
  await saveState();
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
        const exercise = EXERCISE_MAP[event.target.value]
          || state.exerciseCatalog.find((item) => item.id === event.target.value);
        if (exercise) Object.assign(row, exercise);
      }
      editingTemplate = { ...draft, exercises: draft.exercises };
      render();
    }
  }
});

elements.app.addEventListener('submit', async (event) => {
  if (event.target.matches('[data-auth-form]')) {
    event.preventDefault();
    await submitAuth(event.target);
  } else if (event.target.matches('[data-template-form]')) {
    event.preventDefault();
    saveTemplate();
  } else if (event.target.matches('[data-schedule-form]')) {
    event.preventDefault();
    saveWeeklySchedule(event.target);
  }
});

document.addEventListener('click', async (event) => {
  const calendarDay = event.target.closest('[data-calendar-date]');
  if (calendarDay) {
    selectCalendarDate(calendarDay.dataset.calendarDate);
    return;
  }
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;

  const action = actionElement.dataset.action;
  if (action === 'auth-mode') {
    authMode = authMode === 'login' ? 'signup' : 'login';
    authMessage = '';
    authMessageType = 'status';
    render();
  } else if (action === 'home') {
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
    await startTemplate(actionElement.dataset.templateId);
  } else if (action === 'start-scheduled') {
    const scheduled = state.schedule.find((item) => item.id === actionElement.dataset.scheduleId);
    if (!scheduled) {
      showToast('Este treino já não está na agenda.');
      return;
    }
    await startTemplate(scheduled.templateId);
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
    if (template) showModal('Apagar predefinição?', `“${template.name}” e os respetivos agendamentos serão removidos. Os treinos já guardados não serão afetados.`, 'Apagar treino', async () => {
      state.templates = state.templates.filter((item) => item.id !== template.id);
      state.schedule = state.schedule.filter((item) => item.templateId !== template.id);
      const saved = await saveState();
      render();
      if (saved) showToast('Predefinição apagada.');
    });
  } else if (action === 'resume-workout') {
    activeTab = 'workout';
    render();
  } else if (action === 'workout-primary') {
    const exercise = activeExercise();
    if (exercise?.sets.every((set) => set.complete)) await advanceWorkout();
    else await saveCurrentSet();
  } else if (action === 'continue-after-rest' || action === 'skip-rest') {
    await leaveRest(action === 'skip-rest');
  } else if (action === 'end-early') {
    showModal('Terminar este treino?', 'As séries que já concluíste serão guardadas no histórico. Podes retomar o treino mais tarde apenas se escolheres voltar.', 'Guardar e terminar', finishWorkout);
  } else if (action === 'save-finished') {
    const finishedWorkout = state.activeWorkout;
    state.activeWorkout = null;
    const saved = await saveState();
    if (!saved) {
      state.activeWorkout = finishedWorkout;
      render();
      return;
    }
    activeTab = 'home';
    render();
    showToast('Treino guardado. Cada sessão conta.');
  } else if (action === 'clear-demo') {
    showModal('Remover dados de exemplo?', 'As sessões de demonstração serão removidas da tua conta. Os teus treinos registados ficam intactos.', 'Remover exemplos', async () => {
      const previousHistory = state.history;
      state.history = state.history.filter((workout) => !workout.isDemo);
      const saved = await saveState();
      if (!saved) state.history = previousHistory;
      activeTab = 'profile';
      render();
      if (saved) showToast('Dados de exemplo removidos.');
    });
  } else if (action === 'clear-account-data') {
    showModal('Apagar todos os dados de treino?', 'O histórico, o treino em curso, as predefinições e a agenda serão apagados. A tua conta continuará ativa e esta ação não pode ser anulada.', 'Apagar todos os dados', async () => {
      try {
        await persistenceQueue;
        localStorage.removeItem('forma-training-v1');
        const { error } = await supabase
          .from('user_training_state')
          .delete()
          .eq('user_id', user.id);
        if (error) throw error;
        state = { history: [], activeWorkout: null, templates: [], exerciseCatalog: [], schedule: [], storageError: false };
        editingTemplate = null;
        activeTab = 'profile';
        render();
        showToast('Todos os dados de treino foram apagados.');
      } catch (error) {
        console.error('Não foi possível apagar os dados desta conta.', error);
        showToast(`Não foi possível apagar os dados: ${error.message || 'tenta novamente.'}`);
      }
    });
  } else if (action === 'delete-account') {
    showModal('Apagar a conta permanentemente?', 'A tua conta Supabase e todos os dados associados serão apagados. Não será possível recuperar a conta. Esta ação é irreversível.', 'Apagar a conta', async () => {
      try {
        await persistenceQueue;
        localStorage.removeItem('forma-training-v1');
        const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
        if (error) throw error;
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) {
          throw new Error(`A conta foi apagada, mas não foi possível limpar a sessão deste dispositivo: ${signOutError.message}`);
        }
        user = null;
        state = { history: [], activeWorkout: null, templates: [], exerciseCatalog: [], schedule: [], storageError: false };
        editingTemplate = null;
        activeTab = 'home';
        authMode = 'login';
        authMessage = 'A tua conta e os dados associados foram apagados.';
        authMessageType = 'status';
        render();
      } catch (error) {
        console.error('Não foi possível apagar esta conta.', error);
        showToast(`Não foi possível apagar a conta: ${error.message || 'verifica a configuração da função no Supabase.'}`);
      }
    });
  } else if (action === 'retry-save') {
    await saveState();
    render();
    if (!state.storageError) showToast('Ligação ao Supabase disponível.');
  } else if (action === 'sign-out') {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Não foi possível terminar a sessão.', error);
      showToast('Não foi possível terminar a sessão. Tenta novamente.');
      return;
    }
    user = null;
    state = { history: [], activeWorkout: null, templates: [], exerciseCatalog: [], schedule: [], storageError: false };
    activeTab = 'home';
    authMode = 'login';
    authMessage = '';
    authMessageType = 'status';
    render();
  } else if (action === 'dismiss-modal') {
    elements.modalRoot.innerHTML = '';
  }
});

// Função principal de arranque assíncrona
async function initApp() {
  if (!supabaseConfigured || !supabase) {
    render();
    return;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      render();
      return;
    }
    await activateUser(data.session.user);
    if (state.activeWorkout?.restEndsAt && state.activeWorkout.restEndsAt <= Date.now()) {
      state.activeWorkout.restEndsAt = null;
      await saveState();
    }
  } catch (error) {
    console.error('Erro ao inicializar a aplicação com o Supabase:', error);
    authMessage = `Não foi possível ligar ao Supabase: ${error.message}`;
    authMessageType = 'error';
    render();
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && user) {
      user = null;
      state = { history: [], activeWorkout: null, templates: [], exerciseCatalog: [], schedule: [], storageError: false };
      activeTab = 'home';
      authMode = 'login';
      authMessage = '';
      authMessageType = 'status';
      render();
    }
  });
}

// Iniciar a aplicação
initApp();