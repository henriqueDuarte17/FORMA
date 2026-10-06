import { dateKey } from '../utils.js';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function renderCalendar({ month, selectedDate, markedDates, label }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const leading = Array.from({ length: mondayOffset }, () => '<span class="calendar-blank" aria-hidden="true"></span>').join('');
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1, 12);
    const key = dateKey(date);
    const markers = markedDates.get(key) || [];
    const classes = [
      'calendar-day',
      key === selectedDate ? 'is-selected' : '',
      key === dateKey() ? 'is-today' : '',
      markers.includes('history') ? 'has-history' : '',
      markers.includes('demo') ? 'has-demo' : ''
    ].filter(Boolean).join(' ');
    const marker = markers.length ? '<span class="calendar-mark" aria-hidden="true"></span>' : '';
    const count = markers.filter((item) => item === 'history' || item === 'demo').length;
    const spokenDate = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    const description = count ? `${count} ${count === 1 ? 'treino' : 'treinos'}` : 'sem treinos';
    return `<button type="button" class="${classes}" data-calendar-date="${key}" aria-label="${spokenDate}, ${description}" ${key === selectedDate ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${index + 1}${marker}</button>`;
  }).join('');
  const remainder = (leading.match(/calendar-blank/g) || []).length + daysInMonth;
  const trailingCount = (7 - remainder % 7) % 7;
  const trailing = Array.from({ length: trailingCount }, () => '<span class="calendar-blank" aria-hidden="true"></span>').join('');
  const monthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(month);

  return `<section class="calendar-panel panel" aria-label="${label}">
    <div class="calendar-heading">
      <h2>${monthLabel}</h2>
      <div class="calendar-controls">
        <button class="icon-button" type="button" data-action="calendar-previous" aria-label="Mês anterior">‹</button>
        <button class="icon-button" type="button" data-action="calendar-today" aria-label="Ir para hoje">Hoje</button>
        <button class="icon-button" type="button" data-action="calendar-next" aria-label="Mês seguinte">›</button>
      </div>
    </div>
    <div class="calendar-grid calendar-weekdays" aria-hidden="true">${WEEKDAYS.map((day) => `<span>${day}</span>`).join('')}</div>
    <div class="calendar-grid calendar-days">${leading}${days}${trailing}</div>
    <div class="calendar-legend">
      <span><i class="calendar-legend-dot history"></i>Treino concluído</span>${[...markedDates.values()].some((markers) => markers.includes('demo')) ? '<span><i class="calendar-legend-dot demo"></i>Exemplo</span>' : ''}
    </div>
  </section>`;
}
