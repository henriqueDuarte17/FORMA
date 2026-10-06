import { PROGRAM } from '../data.js';
import { escapeHtml } from '../utils.js';

function renderExerciseRow(exercise, index, exerciseCatalog) {
  const isCustomExercise = !PROGRAM.some((item) => item.id === exercise.id);
  const normalizedName = exercise.name?.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ');
  const catalogExercise = exerciseCatalog.find((item) => item.id === exercise.id)
    || exerciseCatalog.find((item) =>
      item.name.trim().toLocaleLowerCase('pt-PT').replace(/\s+/g, ' ') === normalizedName);
  const isNewCustom = isCustomExercise && !catalogExercise;
  const options = [
    ...PROGRAM.map((item) =>
      `<option value="${item.id}" ${item.id === exercise.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
    ),
    ...exerciseCatalog.map((item) =>
      `<option value="${escapeHtml(item.id)}" ${item.id === exercise.id || item === catalogExercise ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
    ),
    `<option value="__custom__" ${isNewCustom ? 'selected' : ''}>＋ Escrever novo exercício</option>`
  ].join('');

  return `<article class="template-exercise-row" data-exercise-row>
    <div class="template-exercise-title">
      <span class="template-exercise-index">${String(index + 1).padStart(2, '0')}</span>
      <label class="template-field template-exercise-select"><span>Exercício</span>
        <select data-exercise-id="${escapeHtml(exercise.id)}" data-custom-id="${isNewCustom ? escapeHtml(exercise.id) : ''}" aria-label="Exercício ${index + 1}">
          ${options}
        </select>
      </label>
      <button class="icon-button template-remove-button" type="button" data-action="remove-template-exercise" aria-label="Remover exercício ${index + 1}">×</button>
    </div>
    ${isNewCustom ? `<label class="template-field"><span>Nome do exercício</span><input data-custom-name type="text" maxlength="50" value="${escapeHtml(exercise.name === 'Novo exercício' ? '' : exercise.name)}" placeholder="Ex.: Peso morto romeno"></label>` : ''}
    <div class="template-exercise-settings">
      <label class="template-field"><span>Séries</span><input data-setting="sets" type="number" min="1" max="20" step="1" value="${escapeHtml(exercise.sets)}" inputmode="numeric"></label>
      <label class="template-field"><span>Repetições alvo</span><input data-setting="reps" type="number" min="1" max="999" step="1" value="${escapeHtml(exercise.reps)}" inputmode="numeric"></label>
      <label class="template-field"><span>Peso inicial · kg</span><input data-setting="weight" type="number" min="0" max="999" step="0.5" value="${escapeHtml(exercise.weight)}" inputmode="decimal"></label>
    </div>
  </article>`;
}

function renderEditor(template, exerciseCatalog) {
  return `<form class="template-editor panel" data-template-form>
    <div class="template-editor-heading">
      <div><span class="eyebrow">${template.id ? 'Editar predefinição' : 'Nova predefinição'}</span><h2>${template.id ? 'Ajusta o teu treino' : 'Monta o teu treino'}</h2></div>
      <button class="icon-button" type="button" data-action="cancel-template-edit" aria-label="Fechar editor">×</button>
    </div>
    <label class="template-field template-name-field"><span>Nome do treino</span><input name="template-name" type="text" maxlength="50" required value="${escapeHtml(template.name || '')}" placeholder="Ex.: Treino de pernas"></label>
    <div class="template-exercises-heading"><h3>Exercícios</h3><span>Define séries, repetições alvo e peso inicial</span></div>
    <div class="template-exercise-list">${template.exercises.map((exercise, index) => renderExerciseRow(exercise, index, exerciseCatalog)).join('')}</div>
    <button class="secondary-button template-add-exercise" type="button" data-action="add-template-exercise">＋ Adicionar exercício</button>
    <div class="template-editor-actions">
      <button class="quiet-button" type="button" data-action="cancel-template-edit">Cancelar</button>
      <button class="primary-button" type="submit">Guardar predefinição</button>
    </div>
  </form>`;
}

export function renderTemplates({ app, state, errorBanner, editingTemplate }) {
  const cards = state.templates.map((template) => {
    const totalSets = template.exercises.reduce((sum, exercise) => sum + Number(exercise.sets), 0);
    return `<article class="template-card">
      <div class="template-card-top">
        <span class="summary-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h10M4 9v6m16-6v6M7 8v8m10-8v8"/></svg></span>
        <div class="template-card-title"><h2>${escapeHtml(template.name)}</h2><span>${template.exercises.length} exercícios · ${totalSets} séries</span></div>
      </div>
      <ul class="template-exercise-preview">${template.exercises.map((exercise) =>
        `<li>${escapeHtml(exercise.name)} <span>${exercise.sets} × ${exercise.reps} · ${exercise.weight} kg</span></li>`
      ).join('')}</ul>
      <div class="template-card-actions">
        <button class="primary-button" data-action="start-template" data-template-id="${escapeHtml(template.id)}">Começar este treino</button>
        <button class="icon-button" data-action="edit-template" data-template-id="${escapeHtml(template.id)}" aria-label="Editar ${escapeHtml(template.name)}">✎</button>
        <button class="icon-button template-delete" data-action="delete-template" data-template-id="${escapeHtml(template.id)}" aria-label="Apagar ${escapeHtml(template.name)}">×</button>
      </div>
    </article>`;
  }).join('');

  app.innerHTML = `<section class="templates-page">
    ${errorBanner()}
    <div class="templates-title-row">
      <div><span class="eyebrow">Prepara antes de treinar</span><h1 class="templates-title">Os teus treinos</h1><p class="page-subtitle">Escolhe uma predefinição e começa logo a registar as séries.</p></div>
      ${!editingTemplate ? '<button class="primary-button new-template-button" data-action="new-template">＋ Criar treino</button>' : ''}
    </div>
    ${editingTemplate ? renderEditor(editingTemplate, state.exerciseCatalog || []) : ''}
    ${cards ? `<div class="template-list">${cards}</div>` : `<div class="empty-state templates-empty"><strong>Ainda não tens predefinições.</strong>Cria um treino com os exercícios, as séries e os pesos que costumas usar.</div>`}
  </section>`;
}
