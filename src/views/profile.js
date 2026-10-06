export function renderProfile({ app, state, errorBanner }) {
  const ownWorkouts = state.history.filter((workout) => !workout.isDemo).length;
  const demoButton = state.history.some((workout) => workout.isDemo)
    ? '<button class="danger-button" data-action="clear-demo">Remover dados de exemplo</button>'
    : '<p class="demo-note">Não existem dados de exemplo guardados.</p>';

  app.innerHTML = `${errorBanner()}<section class="profile-panel">
    <span class="eyebrow">A tua conta neste dispositivo</span><h1 class="profile-title">Os teus dados</h1>
    <p>Os treinos ficam guardados apenas neste dispositivo, através do armazenamento local do navegador. Não é necessária uma conta nem enviamos dados para um servidor.</p>
    <p>${state.history.length} sessões guardadas · ${ownWorkouts} treinos teus</p>
    ${demoButton}
    <div class="profile-actions"><button class="secondary-button" data-action="home">Voltar ao início</button></div>
  </section>`;
}
