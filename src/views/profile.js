import { escapeHtml } from '../utils.js';

export function renderProfile({ app, state, errorBanner, user }) {
  const ownWorkouts = state.history.filter((workout) => !workout.isDemo).length;
  const hasDemoData = state.history.some((workout) => workout.isDemo);

  app.innerHTML = `${errorBanner()}<section class="profile-panel">
    <span class="eyebrow">Conta sincronizada</span><h1 class="profile-title">Os teus dados</h1>
    <p>Os teus treinos estão guardados de forma privada na tua conta Supabase e associados ao teu email.</p>
    <div class="account-email"><span>Email</span><strong>${escapeHtml(user.email)}</strong></div>
    <p>${state.history.length} sessões guardadas · ${ownWorkouts} treinos teus</p>
    <section class="profile-data-actions" aria-label="Gestão dos dados">
      <h2>Gerir dados</h2>
      <p>Remove os exemplos ou apaga os dados de treino guardados nesta conta.</p>
      <button class="danger-button" data-action="clear-demo" ${hasDemoData ? '' : 'disabled'}>${hasDemoData ? 'Remover dados de exemplo' : 'Não há exemplos para remover'}</button>
      <button class="danger-button" data-action="clear-account-data">Apagar todos os dados de treino</button>
    </section>
    <section class="profile-data-actions is-destructive" aria-label="Eliminar conta">
      <h2>Zona irreversível</h2>
      <p>Apaga permanentemente a tua conta e todos os dados associados. Esta ação não pode ser anulada.</p>
      <button class="danger-button" data-action="delete-account">Apagar a minha conta</button>
    </section>
    <div class="profile-actions"><button class="secondary-button" data-action="home">Voltar ao início</button><button class="quiet-button" data-action="sign-out">Terminar sessão</button></div>
  </section>`;
}
