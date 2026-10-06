import { escapeHtml } from '../utils.js';

const WEEKDAYS = [
  { index: 0, name: 'Segunda-feira', short: 'SEG' },
  { index: 1, name: 'Terça-feira', short: 'TER' },
  { index: 2, name: 'Quarta-feira', short: 'QUA' },
  { index: 3, name: 'Quinta-feira', short: 'QUI' },
  { index: 4, name: 'Sexta-feira', short: 'SEX' },
  { index: 5, name: 'Sábado', short: 'SÁB' },
  { index: 6, name: 'Domingo', short: 'DOM' }
];

export function renderSchedule({ app, state, errorBanner }) {
  const today = (new Date().getDay() + 6) % 7;
  const todaySchedule = state.schedule.find((item) => item.weekday === today);
  const todayTemplate = state.templates.find((template) => template.id === todaySchedule?.templateId);

  app.innerHTML = `<section class="schedule-page">
    ${errorBanner()}
    <div class="progress-title-row">
      <div><span class="eyebrow">A tua rotina, ao teu ritmo</span><h1 class="schedule-title">Semana</h1><p class="page-subtitle">Associa uma predefinição a cada dia. A tua rotina fica pronta todas as semanas.</p></div>
    </div>
    ${todayTemplate ? `<article class="weekly-today-card">
      <div><span class="eyebrow">Hoje</span><strong>${escapeHtml(todayTemplate.name)}</strong><span>${todayTemplate.exercises.length} exercícios · pronto a começar</span></div>
      <button class="primary-button" data-action="start-scheduled" data-schedule-id="${escapeHtml(todaySchedule.id)}">Começar treino</button>
    </article>` : ''}
    ${state.templates.length ? `<form class="weekly-schedule-form" data-schedule-form>
      <div class="weekly-day-list">${WEEKDAYS.map((day) => {
        const selected = state.schedule.find((item) => item.weekday === day.index)?.templateId || '';
        const isToday = day.index === today;
        return `<label class="weekly-day-row ${isToday ? 'is-today' : ''}" for="weekday-${day.index}">
          <span class="weekly-day-name"><span class="weekday-badge">${day.short}</span><span>${day.name}${isToday ? '<small>Hoje</small>' : ''}</span></span>
          <select id="weekday-${day.index}" name="weekday-${day.index}" aria-label="Treino de ${day.name}">
            <option value="">Dia livre</option>
            ${state.templates.map((template) => `<option value="${escapeHtml(template.id)}" ${selected === template.id ? 'selected' : ''}>${escapeHtml(template.name)}</option>`).join('')}
          </select>
        </label>`;
      }).join('')}</div>
      <button class="primary-button weekly-save-button" type="submit">Guardar semana</button>
      <p class="weekly-schedule-note">Podes alterar os dias sempre que a tua rotina mudar.</p>
    </form>` : `<div class="empty-state"><strong>Ainda não tens predefinições.</strong>Cria um treino em “Treinos” para poderes organizar a tua semana.</div>`}
  </section>`;
}
