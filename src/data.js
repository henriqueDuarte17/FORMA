import { supabase } from './supabase.js';
export const STORAGE_KEY = 'forma-training-v1';
export const REST_SECONDS = 90;

export const PROGRAM = [
  { id: 'leg-press', name: 'Leg press', detail: 'Máquina · Quadríceps', sets: 3, reps: 10, weight: 80, icon: 'legs' },
  { id: 'chest-press', name: 'Press de peito', detail: 'Máquina · Peito', sets: 3, reps: 10, weight: 35, icon: 'chest' },
  { id: 'seated-row', name: 'Remada sentada', detail: 'Cabo · Costas', sets: 3, reps: 12, weight: 32, icon: 'back' },
  { id: 'shoulder-press', name: 'Press de ombros', detail: 'Halteres · Ombros', sets: 3, reps: 10, weight: 10, icon: 'shoulders' }
];

export const EXERCISE_MAP = Object.fromEntries(PROGRAM.map((exercise) => [exercise.id, exercise]));

export const ICONS = {
  legs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v6m12-6v6M4 10h16M6 10v8m12-8v8M4 18h4m8 0h4M8 7h8"/></svg>',
  chest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7v10m14-10v10M3 10v4m18-4v4M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v3m8-3v3M6 8h12M12 8v7m-5-3 5 3 5-3m-5 0v6"/></svg>',
  shoulders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7v10m12-10v10M4 10v4m16-4v4M6 12h12M12 12v7"/></svg>',
  default: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h10M4 9v6m16-6v6M7 8v8m10-8v8"/></svg>'
};

function sampleDate(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

export function createDemoHistory() {
  return [
    { id: 'demo-1', name: 'Treino A · Corpo inteiro', date: sampleDate(2), duration: 48, sets: 12, isDemo: true, exercises: [
      { id: 'leg-press', sets: [{ weight: 75, reps: 10 }, { weight: 75, reps: 10 }, { weight: 80, reps: 10 }] },
      { id: 'chest-press', sets: [{ weight: 32, reps: 10 }, { weight: 32, reps: 10 }, { weight: 35, reps: 10 }] },
      { id: 'seated-row', sets: [{ weight: 30, reps: 12 }, { weight: 30, reps: 12 }, { weight: 32, reps: 12 }] },
      { id: 'shoulder-press', sets: [{ weight: 8, reps: 10 }, { weight: 10, reps: 10 }, { weight: 10, reps: 10 }] }
    ] },
    { id: 'demo-2', name: 'Treino A · Corpo inteiro', date: sampleDate(5), duration: 51, sets: 12, isDemo: true, exercises: [
      { id: 'leg-press', sets: [{ weight: 70, reps: 10 }, { weight: 75, reps: 10 }, { weight: 75, reps: 10 }] },
      { id: 'chest-press', sets: [{ weight: 30, reps: 10 }, { weight: 32, reps: 10 }, { weight: 32, reps: 10 }] },
      { id: 'seated-row', sets: [{ weight: 27, reps: 12 }, { weight: 30, reps: 12 }, { weight: 30, reps: 12 }] },
      { id: 'shoulder-press', sets: [{ weight: 8, reps: 10 }, { weight: 8, reps: 10 }, { weight: 10, reps: 10 }] }
    ] },
    { id: 'demo-3', name: 'Treino A · Corpo inteiro', date: sampleDate(9), duration: 54, sets: 12, isDemo: true, exercises: [
      { id: 'leg-press', sets: [{ weight: 65, reps: 10 }, { weight: 70, reps: 10 }, { weight: 70, reps: 10 }] },
      { id: 'chest-press', sets: [{ weight: 27, reps: 10 }, { weight: 30, reps: 10 }, { weight: 30, reps: 10 }] },
      { id: 'seated-row', sets: [{ weight: 25, reps: 12 }, { weight: 27, reps: 12 }, { weight: 27, reps: 12 }] },
      { id: 'shoulder-press', sets: [{ weight: 6, reps: 10 }, { weight: 8, reps: 10 }, { weight: 8, reps: 10 }] }
    ] }
  ];
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.history)) {
        const templates = Array.isArray(parsed.templates) ? parsed.templates : [createDefaultTemplate()];
        return {
          ...parsed,
          templates,
          schedule: normalizeWeeklySchedule(parsed.schedule, templates),
          storageError: false
        };
      }
    }
    return { history: createDemoHistory(), activeWorkout: null, templates: [createDefaultTemplate()], schedule: [], storageError: false };
  } catch (error) {
    console.error('Não foi possível ler os dados guardados.', error);
    return { history: createDemoHistory(), activeWorkout: null, templates: [createDefaultTemplate()], schedule: [], storageError: true };
  }
}

function normalizeWeeklySchedule(schedule, templates) {
  if (!Array.isArray(schedule)) return [];
  const templateIds = new Set(templates.map((template) => template.id));
  const byWeekday = new Map();

  schedule.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (!templateIds.has(entry.templateId)) return;
    let weekday = entry.weekday;
    if (!Number.isInteger(weekday) && typeof entry.date === 'string') {
      const date = new Date(`${entry.date}T12:00:00`);
      if (!Number.isFinite(date.getTime())) return;
      weekday = (date.getDay() + 6) % 7;
    }
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) {
      byWeekday.set(weekday, { id: `schedule-${weekday}`, weekday, templateId: entry.templateId });
    }
  });

  return [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday);
}

export function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    history: state.history,
    activeWorkout: state.activeWorkout,
    templates: state.templates,
    schedule: state.schedule
  }));
}

export function findPreviousWorkout(history, exerciseId, exerciseName) {
  const normalizedName = exerciseName?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ');
  return history
    .filter((workout) => (workout.exercises || []).some((exercise) =>
      exercise.id === exerciseId
      || (normalizedName && exercise.name?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export function createDefaultTemplate() {
  return {
    id: 'template-full-body',
    name: 'Treino A · Corpo inteiro',
    exercises: PROGRAM.map((exercise) => ({ ...exercise }))
  };
}

export function createWorkout(history, template) {
  const realHistory = history.filter((workout) => !workout.isDemo);
  const exercises = template.exercises.map((exercise) => {
    const normalizedName = exercise.name?.trim().toLocaleLowerCase();
    const previous = findPreviousWorkout(realHistory, exercise.id, exercise.name)?.exercises
      .find((item) => item.id === exercise.id
        || (normalizedName && item.name?.trim().toLocaleLowerCase() === normalizedName));
    const previousLastSet = previous?.sets?.[previous.sets.length - 1];
    return {
      ...exercise,
      sets: Array.from({ length: Number(exercise.sets) }, (_, index) => {
        const previousSet = previous?.sets?.[index] || previousLastSet;
        return {
          weight: previousSet ? Number(previousSet.weight) : Number(exercise.weight),
          reps: previousSet ? Number(previousSet.reps) : Number(exercise.reps),
          complete: false
        };
      })
    };
  });

  return {
    id: `workout-${Date.now()}`,
    templateId: template.id,
    name: template.name,
    startedAt: new Date().toISOString(),
    exerciseIndex: 0,
    exercises,
    restEndsAt: null
  };
}
