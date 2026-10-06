import { escapeHtml } from '../utils.js';

export function renderAuth({ app, mode, configured, configurationError, message, messageType, submitting }) {
  const isSignUp = mode === 'signup';
  const feedbackMessage = submitting
    ? (isSignUp ? 'A criar a tua conta…' : 'A iniciar sessão e a carregar os teus dados…')
    : message;
  app.innerHTML = `<section class="auth-page">
    <div class="auth-card">
      <span class="auth-mark" aria-hidden="true">F</span>
      <span class="eyebrow">Treina ao teu ritmo</span>
      <h1>${isSignUp ? 'Cria a tua conta' : 'Bem-vindo de volta'}</h1>
      <p class="auth-intro">${isSignUp
        ? 'Cria uma conta para guardar os teus treinos e aceder-lhes em qualquer dispositivo.'
        : 'Inicia sessão para aceder aos teus treinos guardados na tua conta.'}</p>
      ${!configured ? `<div class="auth-message is-error" role="alert">${escapeHtml(configurationError || 'A ligação ao Supabase não está configurada.')}</div>` : ''}
      ${feedbackMessage ? `<div class="auth-message${!submitting && messageType === 'error' ? ' is-error' : ''}" role="${!submitting && messageType === 'error' ? 'alert' : 'status'}" aria-live="polite">${escapeHtml(feedbackMessage)}</div>` : ''}
      <form class="auth-form" data-auth-form>
        <label class="auth-field"><span>Email</span><input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="nome@exemplo.pt"></label>
        <label class="auth-field"><span>Palavra-passe</span><input name="password" type="password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}" required minlength="6"></label>
        <button class="primary-button auth-submit" type="submit" ${submitting ? 'disabled' : ''}>${submitting ? (isSignUp ? 'A criar conta…' : 'A iniciar sessão…') : (isSignUp ? 'Criar conta' : 'Iniciar sessão')}</button>
      </form>
      <button class="text-link auth-switch" type="button" data-action="auth-mode" ${submitting ? 'disabled' : ''}>${isSignUp ? 'Já tens conta? Inicia sessão' : 'Ainda não tens conta? Criar conta'}</button>
    </div>
  </section>`;
}
