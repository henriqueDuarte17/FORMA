import { escapeHtml } from '../utils.js';

export function renderProfile({ app, state, errorBanner, user }) {
  const ownWorkouts = state.history.filter((workout) => !workout.isDemo).length;
  const demoButton = state.history.some((workout) => workout.isDemo)
    ? '<button class="danger-button" data-action="clear-demo">Remover dados de exemplo</button>'
    : '<p class="demo-note">Não existem dados de exemplo guardados.</p>';

  app.innerHTML = `${errorBanner()}<section class="profile-panel">
    <span class="eyebrow">Conta sincronizada</span><h1 class="profile-title">Os teus dados</h1>
    <p>Os teus treinos estão guardados de forma privada na tua conta Supabase e associados ao teu email.</p>
    <div class="account-email"><span>Email</span><strong>${escapeHtml(user.email)}</strong></div>
    <p>${state.history.length} sessões guardadas · ${ownWorkouts} treinos teus</p>
    ${demoButton}
    <div class="profile-actions"><button class="secondary-button" data-action="home">Voltar ao início</button><button class="quiet-button" data-action="sign-out">Terminar sessão</button></div>
  </section>`;
}
