const USER_KEY = "previa_user";

export interface UserInfo {
  name: string;
  email: string;
}

export function getUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setUser(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function showLogin(onLogin: (user: UserInfo) => void): void {
  const overlay = document.createElement("div");
  overlay.className = "login-overlay";

  overlay.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <svg viewBox="0 0 24 24" width="40" height="40">
          <text x="12" y="18" text-anchor="middle" font-family="'Sifonn Basic Outline', 'Sifonn Basic', sans-serif" font-size="22" fill="white">P</text>
        </svg>
      </div>
      <h1 class="login-title">PRÉVIA</h1>
      <p class="login-subtitle">O obstáculo, previsto a tempo</p>
      <p class="login-desc">Acesse com sua conta Google</p>
      <button class="login-google-btn">
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
        Entrar com Google
      </button>
    </div>
  `;

  const googleBtn = overlay.querySelector<HTMLButtonElement>(".login-google-btn")!;

  googleBtn.addEventListener("click", () => {
    overlay.remove();
    showMockConsent(onLogin);
  });

  document.body.appendChild(overlay);
}

function showMockConsent(onLogin: (user: UserInfo) => void): void {
  const overlay = document.createElement("div");
  overlay.className = "login-overlay";

  overlay.innerHTML = `
    <div class="login-card login-card-sm">
      <div class="login-google-icon-bar">
        <svg width="22" height="22" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
        <span>Fazer login com Google</span>
      </div>
      <p class="login-desc" style="margin-top:20px">Escolha a conta para continuar</p>
      <div class="login-mock-card" tabindex="0">
        <div class="login-mock-avatar">T</div>
        <div class="login-mock-info">
          <input class="login-mock-name" placeholder="Seu nome" value="Tiago" />
          <input class="login-mock-email" placeholder="seu@gmail.com" value="tiago@gmail.com" />
        </div>
      </div>
      <p class="login-legal">Para continuar, o PRÉVIA precisará do seu nome e e-mail.</p>
      <button class="login-btn login-btn-continuar">Continuar</button>
    </div>
  `;

  const nameInput = overlay.querySelector<HTMLInputElement>(".login-mock-name")!;
  const emailInput = overlay.querySelector<HTMLInputElement>(".login-mock-email")!;
  const continuarBtn = overlay.querySelector<HTMLButtonElement>(".login-btn-continuar")!;

  const submit = () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name) { nameInput.style.borderColor = "#ef4444"; return; }
    if (!email || !email.includes("@")) { emailInput.style.borderColor = "#ef4444"; return; }
    const user: UserInfo = { name, email };
    setUser(user);
    overlay.remove();
    onLogin(user);
  };

  continuarBtn.addEventListener("click", submit);
  emailInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  document.body.appendChild(overlay);
  setTimeout(() => nameInput.focus(), 100);
}
