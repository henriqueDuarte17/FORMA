export function formatDate(date, options = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('pt-PT', options).format(new Date(date));
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function elapsedSeconds(workout) {
  return Math.max(0, Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  return `${String(mins).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function countCompletedSets(workout) {
  return workout.exercises.reduce((sum, exercise) =>
    sum + exercise.sets.filter((set) => set.complete).length, 0);
}

export function countWorkoutSets(workout) {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function weekdayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}
