import { renderConfigHeader } from "./components/ConfigHeader";
import { renderLookAheadKanban } from "./components/LookAheadKanban";
import { renderFieldMestreView } from "./components/FieldMestreView";
import { normalizeFromMemory, type CanonicalTask, computeAlerts, recalcTaskStatus } from "./utils/dataAdapter";
import { loadXLSX, callChecklistPreditiva } from "./utils/aiConnectors";
import { getApiKey, getTasks, setTasks } from "./store/localStorageEngine";

let alertInterval: ReturnType<typeof setInterval> | null = null;

export function initLookAhead(
  container: HTMLElement,
  getCronograma: () => any[],
  onBack?: () => void,
): void {
  container.innerHTML = "";
  container.className = "bs-container";

  if (onBack) {
    const backBar = document.createElement("div");
    backBar.className = "bs-back-bar";
    const backBtn = document.createElement("button");
    backBtn.className = "bs-back-btn";
    backBtn.textContent = "← Voltar ao Viewer 3D";
    backBtn.addEventListener("click", () => {
      stopAlertEngine();
      onBack();
    });
    backBar.appendChild(backBtn);
    container.appendChild(backBar);
  }

  renderConfigHeader(container);

  // Alert banner
  const alertBanner = document.createElement("div");
  alertBanner.className = "bs-alert-banner";
  alertBanner.hidden = true;
  container.appendChild(alertBanner);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "bs-tabs";

  const kanbanTab = document.createElement("button");
  kanbanTab.className = "bs-tab active";
  kanbanTab.textContent = "📋 Look-Ahead (W+1 a W+4)";

  const fieldTab = document.createElement("button");
  fieldTab.className = "bs-tab";
  fieldTab.textContent = "📱 Visão do Mestre";

  tabs.append(kanbanTab, fieldTab);
  container.appendChild(tabs);

  const content = document.createElement("div");
  content.className = "bs-content";
  container.appendChild(content);

  let tasks: CanonicalTask[] = [];

  function updateAlertBanner() {
    const alerts = computeAlerts(tasks);
    if (alerts.length > 0) {
      alertBanner.hidden = false;
      alertBanner.innerHTML = `<span class="bs-alert-banner-icon">🔔</span>
        <span class="bs-alert-banner-text"><strong>${alerts.length}</strong> alerta${alerts.length > 1 ? "s" : ""} ativo${alerts.length > 1 ? "s" : ""}</span>
        <span class="bs-alert-banner-detail">${alerts.slice(0, 3).map((a) => a.descricao).join(" · ")}${alerts.length > 3 ? ` · +${alerts.length - 3} mais` : ""}</span>`;
      alertBanner.className = "bs-alert-banner";
      if (alerts.some((a) => a.tipo === "MANUTENCAO_EM_FALTA")) alertBanner.classList.add("bs-alert-banner-critical");
    } else {
      alertBanner.hidden = true;
    }
  }

  function loadAndRender() {
    let raw: any[] | null = null;
    try {
      raw = getCronograma();
    } catch {
      raw = null;
    }

    if (raw && Array.isArray(raw) && raw.length > 0) {
      tasks = normalizeFromMemory(raw);
    } else {
      const stored = getTasks();
      if (stored && stored.length > 0) {
        tasks = stored;
      }
    }

    if (tasks.length > 0) {
      setTasks(tasks);
      renderCurrentView();
      startAlertEngine();
      // Auto-generate predictive checklists in background for first 3 tasks
      generateMissingChecklists(tasks, 3).then(() => {
        setTasks(tasks);
        renderCurrentView();
      });
    } else {
      renderDropzone(content, (loaded) => {
        tasks = loaded;
        setTasks(tasks);
        renderCurrentView();
        startAlertEngine();
        generateMissingChecklists(tasks, 3).then(() => {
          setTasks(tasks);
          renderCurrentView();
        });
      });
    }
  }

  function renderCurrentView() {
    content.innerHTML = "";
    updateAlertBanner();
    const activeView = document.querySelector(".bs-tab.active")?.textContent?.includes("Mestre") ? "field" : "kanban";
    if (activeView === "field") {
      renderFieldMestreView(content, tasks, (updated) => {
        tasks = updated;
        setTasks(tasks);
        updateAlertBanner();
      });
    } else {
      renderLookAheadKanban(content, tasks, (updated) => {
        tasks = updated;
        setTasks(tasks);
        updateAlertBanner();
      });
    }
  }

  kanbanTab.addEventListener("click", () => {
    kanbanTab.classList.add("active");
    fieldTab.classList.remove("active");
    renderCurrentView();
  });

  fieldTab.addEventListener("click", () => {
    fieldTab.classList.add("active");
    kanbanTab.classList.remove("active");
    renderCurrentView();
  });

  function startAlertEngine() {
    stopAlertEngine();
    updateAlertBanner();
    alertInterval = setInterval(() => {
      updateAlertBanner();
    }, 300000); // 5 min
  }

  loadAndRender();
}

function stopAlertEngine() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}

async function generateMissingChecklists(tasks: CanonicalTask[], maxCount = Infinity): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const missing = tasks.filter((t) => {
    const allEmpty = Object.values(t.restrictions).every((r) => !r.checklist || r.checklist.length === 0);
    return allEmpty;
  });

  if (missing.length === 0) return;
  const toProcess = missing.slice(0, maxCount);
  const remaining = missing.length - toProcess.length;

  // Process sequentially to avoid rate limits
  for (const task of toProcess) {
    try {
      const result = await callChecklistPreditiva(task, apiKey);
      for (const [cat, items] of Object.entries(result)) {
        const catKey = cat === "pendências" ? "pendencias" : cat;
        const category = catKey as keyof typeof task.restrictions;
        if (task.restrictions[category] && items && items.length > 0) {
          task.restrictions[category].checklist = items.map((r: any) => ({
            id: `CL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            descricao: r.descricao || "",
            categoria: category,
            quantidadeEstimada: r.quantidadeEstimada ?? "",
            quantidadeConfirmada: r.quantidadeConfirmada !== false,
            responsavel: { nome: "", email: "" },
            status: "PENDENTE" as const,
            prazoNecessario: "",
            guiaRemessa: null,
            planoManutencao: r.exigeManutencao ? { emDia: true, proximaData: "" } : null,
            notificacoes: { ultimoAlertaEnviado: "", tipoAlerta: "" },
            notas: "",
          }));
        }
      }
      recalcTaskStatus(task);
    } catch {
      // skip this task if AI fails
    }
  }

  if (remaining > 0) {
    addGenerateAllButton(remaining);
  }
}

function addGenerateAllButton(remaining: number): void {
  const existing = document.querySelector(".bs-gen-all-checklists");
  if (existing) return;
  const btn = document.createElement("button");
  btn.className = "bs-btn bs-btn-primary bs-btn-lg bs-gen-all-checklists";
  btn.textContent = `🤖 Gerar Checklists (${remaining} restantes)`;
  const content = document.querySelector(".bs-content");
  if (content) content.prepend(btn);
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Gerando... Isto pode demorar.";
    const apiKey = getApiKey();
    if (!apiKey) { alert("Configure a chave de API primeiro."); return; }
    let processed = 0;
    const storedTasks = getTasks() as CanonicalTask[];
    for (const task of storedTasks) {
      const hasChecklist = Object.values(task.restrictions).some((r) => r.checklist && r.checklist.length > 0);
      if (hasChecklist) continue;
      processed++;
      btn.textContent = `Gerando... ${processed}/${remaining}`;
      try {
        const result = await callChecklistPreditiva(task, apiKey);
        for (const [cat, items] of Object.entries(result)) {
          const catKey = cat === "pendências" ? "pendencias" : cat;
          const category = catKey as keyof typeof task.restrictions;
          if (task.restrictions[category] && items && items.length > 0) {
            task.restrictions[category].checklist = items.map((r: any) => ({
              id: `CL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              descricao: r.descricao || "",
              categoria: category,
              quantidadeEstimada: r.quantidadeEstimada ?? "",
              quantidadeConfirmada: r.quantidadeConfirmada !== false,
              responsavel: { nome: "", email: "" },
              status: "PENDENTE" as const,
              prazoNecessario: "",
              guiaRemessa: null,
              planoManutencao: r.exigeManutencao ? { emDia: true, proximaData: "" } : null,
              notificacoes: { ultimoAlertaEnviado: "", tipoAlerta: "" },
              notas: "",
            }));
          }
        }
        recalcTaskStatus(task);
      } catch { /* skip */ }
    }
    setTasks(storedTasks);
    btn.textContent = "✔ Concluído!";
    setTimeout(() => location.reload(), 1000);
  });
}

function renderDropzone(container: HTMLElement, onLoad: (tasks: CanonicalTask[]) => void): void {
  container.innerHTML = `
    <div class="bs-dropzone" id="bs-dropzone">
      <div class="bs-dropzone-icon">📂</div>
      <p><strong>Clique para carregar</strong> ou arraste um arquivo CSV/XLSX</p>
      <p style="font-size:12px">Formato: ID, Nome da Tarefa, Data Inicio, Data Fim, Setor</p>
    </div>
  `;

  const dz = container.querySelector("#bs-dropzone")!;

  dz.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const rows = await parseFile(file);
        const loadedTasks = normalizeFromMemory(rows);
        if (loadedTasks.length === 0) {
          alert("Nenhuma tarefa encontrada no arquivo. Verifique o formato.");
          return;
        }
        onLoad(loadedTasks);
      } catch (err: any) {
        alert(`Erro ao ler arquivo: ${err.message}`);
      }
    });
    input.click();
  });

  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("dragover");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz.addEventListener("drop", (async (ev: Event) => {
    const e = ev as DragEvent;
    e.preventDefault();
    dz.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const rows = await parseFile(file);
      const loadedTasks = normalizeFromMemory(rows);
      if (loadedTasks.length === 0) {
        alert("Nenhuma tarefa encontrada no arquivo.");
        return;
      }
      onLoad(loadedTasks);
    } catch (err: any) {
      alert(`Erro ao ler arquivo: ${err.message}`);
    }
  }) as EventListener);
}

async function parseFile(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = await file.text();
    return parseCSV(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    await loadXLSX();
    const XLSX = (window as any).XLSX;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return rows.map((r: Record<string, any>) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = String(v ?? "");
      }
      return out;
    });
  }

  throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"(.*)"$/, "$1"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = vals[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}
