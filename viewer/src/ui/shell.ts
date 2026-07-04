import { getUser } from "./login";

export interface ShellHandles {
  viewportEl: HTMLElement;
  ganttEl: HTMLElement;
  treeEl: HTMLElement;
  propsEl: HTMLElement;
  fileInput: HTMLInputElement;
}

/**
 * Canvas 3D infinito ao fundo, três painéis flutuantes por cima:
 * ESQUERDA = árvore, DIREITA = propriedades, BAIXO = gantt.
 * Painéis laterais são redimensionáveis; minimizar vira um ícone flutuante.
 */
export function buildShell(root: HTMLElement): ShellHandles {
  root.innerHTML = "";
  root.className = "shell";

  // ---- canvas de fundo (tela cheia) ----
  const viewportEl = el("div", "viewport");

  // ---- barra flutuante de import ----
  const bar = el("div", "topbar-float");
  const brand = el("span", "brand");
  brand.textContent = "BIM VIEWER";
  const fileInput = el("input", "") as HTMLInputElement;
  fileInput.type = "file";
  fileInput.accept = ".ifc";
  fileInput.multiple = true;
  fileInput.hidden = true;
  const importBtn = el("label", "btn-import-icon") as HTMLLabelElement;
  importBtn.title = "Importar IFC";
  importBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
  importBtn.appendChild(fileInput);

  const lookaheadBtn = document.createElement("button");
  lookaheadBtn.className = "btn-lookahead";
  lookaheadBtn.id = "btn-lookahead";
  lookaheadBtn.title = "PRÉVIA";
  lookaheadBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><text x="12" y="18" text-anchor="middle" font-family="'Sifonn Basic Outline', 'Sifonn Basic', sans-serif" font-size="22" fill="white">P</text></svg>`;
  lookaheadBtn.addEventListener("click", () => {
    const evt = new CustomEvent("open-lookahead", { bubbles: true });
    lookaheadBtn.dispatchEvent(evt);
  });

  // ---- menu do utilizador ----
  const userMenu = el("div", "user-menu");
  const userToggle = el("button", "user-toggle") as HTMLButtonElement;
  const u = getUser();
  const initial = u?.name?.charAt(0).toUpperCase() ?? "?";
  userToggle.innerHTML = `<span class="user-avatar">${initial}</span><span class="user-name">${u?.name ?? "Utilizador"}</span>`;
  userMenu.appendChild(userToggle);

  const userDropdown = el("div", "user-dropdown");
  userDropdown.hidden = true;
  userDropdown.innerHTML = `
    <div class="user-dropdown-header">
      <span class="user-dropdown-name">${u?.name ?? "—"}</span>
      <span class="user-dropdown-email">${u?.email ?? "—"}</span>
    </div>
    <button class="user-dropdown-item" id="user-settings-btn">⚙ Definições</button>
    <button class="user-dropdown-item user-dropdown-logout" id="user-logout-btn">🚪 Sair</button>
  `;
  userMenu.appendChild(userDropdown);

  userToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.hidden = !userDropdown.hidden;
  });
  document.addEventListener("click", () => { userDropdown.hidden = true; }, { capture: true });
  userDropdown.addEventListener("click", (e) => e.stopPropagation());

  bar.append(brand, importBtn, lookaheadBtn, userMenu);

  // ---- banner PRÉVIA (canto superior direito) ----
  const logoBanner = el("div", "logo-banner");
  const logoSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  logoSvg.setAttribute("viewBox", "0 0 120 28");
  logoSvg.setAttribute("width", "120");
  logoSvg.setAttribute("height", "28");
  const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textEl.setAttribute("x", "4");
  textEl.setAttribute("y", "21");
  textEl.setAttribute("font-family", "'Sifonn Basic Outline', 'Sifonn Basic', sans-serif");
  textEl.setAttribute("font-size", "18");
  textEl.setAttribute("fill", "white");
  textEl.setAttribute("letter-spacing", "3");
  textEl.textContent = "PRÉVIA";
  logoSvg.appendChild(textEl);
  logoBanner.appendChild(logoSvg);

  // ---- painel esquerdo: árvore ----
  const left = floatPanel("MODELO IFC", "panel-left", "🗂");
  addResize(left.panel, "left");
  const search = el("input", "tree-search") as HTMLInputElement;
  search.placeholder = "Buscar no modelo…";
  const treeEl = el("div", "tree");
  treeEl.innerHTML = `<p class="empty">Importe um IFC para ver a estrutura.</p>`;
  left.body.append(search, treeEl);

  // ---- painel direito: propriedades ----
  const right = floatPanel("PROPRIEDADES", "panel-right", "🏷");
  addResize(right.panel, "right");
  const propsEl = el("div", "props");
  propsEl.innerHTML = `<p class="empty">Selecione um elemento.</p>`;
  right.body.append(propsEl);

  // ---- painel inferior: gantt ----
  const bottom = floatPanel("PLANEJAMENTO - GANTT", "panel-bottom", "📅");
  addResize(bottom.panel, "bottom");
  const ganttEl = el("section", "gantt");
  bottom.body.append(ganttEl);

  root.append(
    viewportEl,
    bar,
    logoBanner,
    left.panel, left.chip,
    right.panel, right.chip,
    bottom.panel, bottom.chip,
  );

  return { viewportEl, ganttEl, treeEl, propsEl, fileInput };
}

/**
 * Painel flutuante. O botão do header minimiza: esconde o painel e mostra um
 * chip (ícone) no mesmo canto; clicar no chip restaura.
 */
function floatPanel(
  title: string,
  cls: string,
  icon: string,
): { panel: HTMLElement; body: HTMLElement; chip: HTMLElement } {
  const panel = el("aside", `panel ${cls}`);
  const head = el("div", "panel-head");
  const label = el("span", "panel-title");
  label.textContent = title;
  const toggle = el("button", "panel-min") as HTMLButtonElement;
  toggle.textContent = "–";
  toggle.title = "Minimizar";
  head.append(label, toggle);
  const body = el("div", "panel-body");
  panel.append(head, body);

  // Chip: mesmo canto do painel (herda posição via a classe cls), escondido até minimizar.
  const chip = el("button", `panel-chip ${cls}`) as HTMLButtonElement;
  chip.textContent = icon;
  chip.title = title;
  chip.hidden = true;

  toggle.addEventListener("click", () => {
    panel.hidden = true;
    chip.hidden = false;
  });
  chip.addEventListener("click", () => {
    chip.hidden = true;
    panel.hidden = false;
  });
  return { panel, body, chip };
}

/**
 * Handle de arraste na borda do painel. side="left"/"right" → largura
 * (col-resize); side="bottom" → altura (row-resize).
 */
function addResize(panel: HTMLElement, side: "left" | "right" | "bottom"): void {
  const handle = el("div", "panel-resize");
  if (side === "bottom") {
    handle.classList.add("row", "resize-bottom");
    panel.appendChild(handle);
    const sidePanels = () => document.querySelectorAll<HTMLElement>(".panel-left, .panel-right");
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startH = panel.getBoundingClientRect().height;
      const onMove = (ev: PointerEvent) => {
        const dy = startY - ev.clientY;
        const h = Math.max(80, startH + dy);
        panel.style.height = `${h}px`;
        const sideBottom = 12 + h + 5;
        for (const s of sidePanels()) s.style.bottom = `${sideBottom}px`;
      };
      const onUp = (ev: PointerEvent) => {
        handle.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  } else {
    handle.classList.add("col", `resize-${side}`);
    panel.appendChild(handle);
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = panel.getBoundingClientRect().width;
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const w = Math.max(200, Math.min(640, side === "left" ? startW + dx : startW - dx));
        panel.style.width = `${w}px`;
      };
      const onUp = (ev: PointerEvent) => {
        handle.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
