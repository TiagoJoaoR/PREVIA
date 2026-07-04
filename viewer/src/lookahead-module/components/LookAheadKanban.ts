import { type CanonicalTask, type TaskAlert, computeAlerts } from "../utils/dataAdapter";
import { openRestrictionModal } from "./RestrictionModal";

const R_KEYS: (keyof CanonicalTask["restrictions"])[] = ["projetos", "materiais", "equipamentos", "seguranca", "pendencias"];
const R_LABELS: Record<string, string> = { projetos: "P", materiais: "M", equipamentos: "E", seguranca: "S", pendencias: "N" };

function colorForStatus(status: string): string {
  switch (status) {
    case "VERDE": return "#22c55e";
    case "VERMELHO": return "#ef4444";
    default: return "#eab308";
  }
}

function renderRestrictionDots(task: CanonicalTask): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "bs-dots";
  for (const key of R_KEYS) {
    const dot = document.createElement("span");
    dot.className = "bs-dot";
    dot.textContent = R_LABELS[key];
    dot.style.backgroundColor = colorForStatus(task.restrictions[key].status);
    dot.title = `${key}: ${task.restrictions[key].status}`;
    wrap.appendChild(dot);
  }
  return wrap;
}

function formatWeekLabel(offset: number): string {
  if (offset === 0) return "W+1 (Corrente)";
  return `W+${offset + 1}`;
}

function getWeekStartEnd(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const target = new Date(monday);
  target.setDate(monday.getDate() + offset * 7);
  const end = new Date(target);
  end.setDate(target.getDate() + 6);
  return { start: target, end };
}

function filterByWeek(tasks: CanonicalTask[], offset: number): CanonicalTask[] {
  const { start, end } = getWeekStartEnd(offset);
  return tasks.filter((t) => {
    if (!t.start) return false;
    const d = new Date(t.start);
    return d >= start && d <= end;
  });
}

function hasRedRestriction(task: CanonicalTask): boolean {
  return R_KEYS.some((k) => task.restrictions[k].status === "VERMELHO");
}

function hasNonGreenRestriction(task: CanonicalTask): boolean {
  return R_KEYS.some((k) => task.restrictions[k].status !== "VERDE");
}

function countAlertsForTask(taskId: string, allAlerts: TaskAlert[]): number {
  return allAlerts.filter((a) => a.taskId === taskId).length;
}

function taskAlertDetails(taskId: string, allAlerts: TaskAlert[]): TaskAlert[] {
  return allAlerts.filter((a) => a.taskId === taskId);
}

/** Render alert badge HTML for a card */
function renderAlertBadgeForTask(taskId: string, allAlerts: TaskAlert[]): HTMLElement | null {
  const count = countAlertsForTask(taskId, allAlerts);
  if (count === 0) return null;
  const badge = document.createElement("span");
  badge.className = "bs-alert-badge";
  badge.textContent = `🔔${count}`;
  badge.title = taskAlertDetails(taskId, allAlerts)
    .map((a) => `${a.tipo}: ${a.descricao}`)
    .join("\n");
  return badge;
}

export function renderLookAheadKanban(
  container: HTMLElement,
  tasks: CanonicalTask[],
  onTasksUpdate: (tasks: CanonicalTask[]) => void,
): void {
  container.innerHTML = "";

  const allAlerts = computeAlerts(tasks);
  const totalAlerts = allAlerts.length;

  const topBar = document.createElement("div");
  topBar.className = "bs-kanban-topbar";

  const filterBtn = document.createElement("button");
  filterBtn.className = "bs-btn bs-btn-secondary";
  filterBtn.textContent = "Filtrar Pendências";
  filterBtn.title = "Mostrar apenas tarefas com alguma restrição pendente";

  const countLabel = document.createElement("span");
  countLabel.className = "bs-kanban-count";
  countLabel.textContent = `${tasks.length} atividades`;

  const alertBadge = document.createElement("span");
  if (totalAlerts > 0) {
    alertBadge.className = "bs-alert-badge bs-alert-badge-header";
    alertBadge.textContent = `🔔 ${totalAlerts} alerta${totalAlerts > 1 ? "s" : ""}`;
  }

  const filterDropdown = document.createElement("div");
  filterDropdown.className = "bs-filter-dropdown";
  filterDropdown.hidden = true;
  filterDropdown.innerHTML = `
    <label class="bs-filter-option"><input type="checkbox" data-filter="red"> Apenas Vermelhos</label>
    <label class="bs-filter-option"><input type="checkbox" data-filter="non-green"> Com Pendências</label>
    <button class="bs-btn bs-btn-sm" data-clear>Limpar Filtros</button>
  `;

  filterBtn.addEventListener("click", () => {
    filterDropdown.hidden = !filterDropdown.hidden;
  });

  let activeFilter: "red" | "non-green" | null = null;

  const applyFilter = () => {
    let filtered = [...tasks];
    if (activeFilter === "red") filtered = filtered.filter(hasRedRestriction);
    else if (activeFilter === "non-green") filtered = filtered.filter(hasNonGreenRestriction);
    renderKanban(filtered);
  };

  filterDropdown.addEventListener("change", (e) => {
    const cb = (e.target as HTMLInputElement);
    const val = cb.dataset.filter;
    if (cb.checked) {
      activeFilter = val as "red" | "non-green";
    } else {
      activeFilter = null;
    }
    applyFilter();
    filterDropdown.hidden = true;
  });

  filterDropdown.querySelector("[data-clear]")?.addEventListener("click", () => {
    activeFilter = null;
    filterDropdown.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb as HTMLInputElement).checked = false);
    applyFilter();
    filterDropdown.hidden = true;
  });

  topBar.append(filterBtn, filterDropdown, alertBadge, countLabel);
  container.appendChild(topBar);

  function renderKanban(filteredTasks: CanonicalTask[]) {
    const existing = container.querySelector(".bs-kanban-board");
    if (existing) existing.remove();

    const alerts = computeAlerts(tasks);

    const board = document.createElement("div");
    board.className = "bs-kanban-board";

    for (let offset = 0; offset < 4; offset++) {
      const col = document.createElement("div");
      col.className = "bs-kanban-col";

      const colHeader = document.createElement("div");
      colHeader.className = "bs-kanban-col-header";
      const { start, end } = getWeekStartEnd(offset);
      const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
      colHeader.innerHTML = `<strong>${formatWeekLabel(offset)}</strong><small>${fmt(start)} — ${fmt(end)}</small>`;
      col.appendChild(colHeader);

      const weekTasks = filterByWeek(filteredTasks, offset);

      if (weekTasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "bs-kanban-empty";
        empty.textContent = "Nenhuma atividade";
        col.appendChild(empty);
      } else {
        for (const task of weekTasks) {
          const card = document.createElement("div");
          card.className = "bs-kanban-card";
          if (hasRedRestriction(task)) card.classList.add("bs-card-has-red");

          const cardTitleWrap = document.createElement("div");
          cardTitleWrap.className = "bs-kanban-card-title-wrap";

          const cardTitle = document.createElement("span");
          cardTitle.className = "bs-kanban-card-title";
          cardTitle.textContent = task.name;

          const alertBadgeEl = renderAlertBadgeForTask(task.id, alerts);
          if (alertBadgeEl) cardTitleWrap.appendChild(alertBadgeEl);

          cardTitleWrap.prepend(cardTitle);

          const cardMeta = document.createElement("div");
          cardMeta.className = "bs-kanban-card-meta";
          cardMeta.textContent = `${task.id} · ${task.sector}`;

          const cardDates = document.createElement("div");
          cardDates.className = "bs-kanban-card-dates";
          cardDates.textContent = task.start ? `${task.start} → ${task.end || "—"}` : "";

          card.append(cardTitleWrap, cardMeta, cardDates, renderRestrictionDots(task));
          card.addEventListener("click", () => {
            openRestrictionModal(task, (updated) => {
              Object.assign(task, updated);
              const data = localStorage.getItem("buildsafe_mvp_data");
              if (data) {
                const parsed = JSON.parse(data);
                parsed.tasks = tasks;
                localStorage.setItem("buildsafe_mvp_data", JSON.stringify(parsed));
              }
              onTasksUpdate(tasks);
              renderKanban(filteredTasks);
            });
          });

          col.appendChild(card);
        }
      }

      board.appendChild(col);
    }

    container.appendChild(board);
  }

  renderKanban(tasks);
}
