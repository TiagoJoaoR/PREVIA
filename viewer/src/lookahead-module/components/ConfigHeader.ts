import { getApiKey, setApiKey, clearAll } from "../store/localStorageEngine";

export function renderConfigHeader(container: HTMLElement): void {
  const header = document.createElement("div");
  header.className = "bs-config";

  const logoWrap = document.createElement("span");
  logoWrap.className = "bs-config-logo";
  logoWrap.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><text x="12" y="18" text-anchor="middle" font-family="'Sifonn Basic Outline', 'Sifonn Basic', sans-serif" font-size="22" fill="white">P</text></svg>`;

  const title = document.createElement("span");
  title.className = "bs-config-title";
  title.innerHTML = `<span style="font-family:'Sifonn Basic Outline','Sifonn Basic',sans-serif">PRÉVIA</span>`;

  const field = document.createElement("div");
  field.className = "bs-config-field";

  const label = document.createElement("label");
  label.className = "bs-config-label";
  label.textContent = "Chave da API OpenAI";
  label.htmlFor = "bs-api-key";

  const input = document.createElement("input");
  input.id = "bs-api-key";
  input.type = "password";
  input.className = "bs-config-input";
  input.placeholder = "sk-...";
  input.value = getApiKey();

  const showBtn = document.createElement("button");
  showBtn.className = "bs-config-show";
  showBtn.textContent = "👁";
  showBtn.title = "Mostrar/Ocultar chave";
  showBtn.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });

  input.addEventListener("input", () => {
    setApiKey(input.value.trim());
  });

  const resetBtn = document.createElement("button");
  resetBtn.className = "bs-btn bs-btn-danger";
  resetBtn.textContent = "Resetar Dados";
  resetBtn.title = "Limpa todos os dados salvos";
  resetBtn.addEventListener("click", () => {
    if (confirm("Tem certeza? Todos os dados locais serão apagados.")) {
      clearAll();
      input.value = "";
      location.reload();
    }
  });

  field.append(label, input, showBtn);
  header.append(logoWrap, title, field, resetBtn);
  container.appendChild(header);
}
