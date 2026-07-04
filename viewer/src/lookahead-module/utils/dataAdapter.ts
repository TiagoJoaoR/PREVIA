export interface ChecklistItem {
  id: string;
  descricao: string;
  categoria: "projetos" | "materiais" | "equipamentos" | "seguranca" | "pendencias";
  quantidadeEstimada: string;
  quantidadeConfirmada: boolean;
  responsavel: { nome: string; email: string };
  status: "PENDENTE" | "ENCOMENDADO" | "ENTREGUE" | "CONCLUIDO" | "BLOQUEADO";
  prazoNecessario: string;
  guiaRemessa: { numero: string; dataEntrada: string; evidenciaBase64: string } | null;
  planoManutencao: { emDia: boolean; proximaData: string } | null;
  notificacoes: { ultimoAlertaEnviado: string; tipoAlerta: string };
  notas: string;
}

export interface RestrictionWithChecklist {
  status: "VERDE" | "AMARELO" | "VERMELHO";
  justificativa: string;
  checklist: ChecklistItem[];
}

export interface CanonicalTask {
  id: string;
  name: string;
  start: string;
  end: string;
  sector: string;
  status: "PENDENTE" | "LIBERADO_PLANEJAMENTO" | "CONCLUIDO" | "PARADO_CAMPO";
  restrictions: {
    projetos: RestrictionWithChecklist;
    materiais: RestrictionWithChecklist;
    equipamentos: RestrictionWithChecklist;
    seguranca: RestrictionWithChecklist;
    pendencias: RestrictionWithChecklist;
  };
  fieldUpdate: {
    statusCampo: string;
    transcricaoAudio: string;
    evidenciaBase64: string;
    timestamp: string;
  };
}

export type RestrictionCategory = keyof CanonicalTask["restrictions"];
export const ALL_CATEGORIES: RestrictionCategory[] = ["projetos", "materiais", "equipamentos", "seguranca", "pendencias"];
export const CATEGORY_LABELS: Record<RestrictionCategory, { label: string; icon: string }> = {
  projetos: { label: "Projetos", icon: "📐" },
  materiais: { label: "Materiais", icon: "📦" },
  equipamentos: { label: "Equipamentos", icon: "🔧" },
  seguranca: { label: "Segurança", icon: "🪖" },
  pendencias: { label: "Pendências", icon: "⚠️" },
};

function defaultRestriction(): RestrictionWithChecklist {
  return { status: "AMARELO", justificativa: "", checklist: [] };
}

function defaultFieldUpdate() {
  return { statusCampo: "", transcricaoAudio: "", evidenciaBase64: "", timestamp: "" };
}

export function createCanonical(): CanonicalTask {
  return {
    id: "",
    name: "",
    start: "",
    end: "",
    sector: "",
    status: "PENDENTE",
    restrictions: {
      projetos: defaultRestriction(),
      materiais: defaultRestriction(),
      equipamentos: defaultRestriction(),
      seguranca: defaultRestriction(),
      pendencias: defaultRestriction(),
    },
    fieldUpdate: defaultFieldUpdate(),
  };
}

/** Calcula status de uma categoria baseado nos itens da checklist */
export function calculateChecklistStatus(checklist: ChecklistItem[]): "VERDE" | "AMARELO" | "VERMELHO" {
  if (!checklist || checklist.length === 0) return "AMARELO";
  let hasBlocked = false;
  let hasPending = false;
  const today = new Date();
  for (const item of checklist) {
    if (item.status === "BLOQUEADO") { hasBlocked = true; continue; }
    if (item.status === "ENTREGUE" || item.status === "CONCLUIDO") continue;
    hasPending = true;
    if (item.prazoNecessario && new Date(item.prazoNecessario) < today) hasBlocked = true;
  }
  if (hasBlocked) return "VERMELHO";
  if (hasPending) return "AMARELO";
  return "VERDE";
}

/** Recalcula status de todas as categorias de uma task */
export function recalcTaskStatus(task: CanonicalTask): void {
  for (const key of ALL_CATEGORIES) {
    task.restrictions[key].status = calculateChecklistStatus(task.restrictions[key].checklist);
  }
}

let _checklistCounter = 0;
export function generateChecklistId(): string {
  _checklistCounter++;
  return `CL-${Date.now().toString(36)}-${_checklistCounter}`;
}

/** Popula checklist a partir do resultado da IA */
export function applyIaChecklist(
  task: CanonicalTask,
  iaResult: Record<string, Array<{ descricao: string; quantidadeEstimada?: string; quantidadeConfirmada?: boolean; exigeManutencao?: boolean }>>,
): void {
  for (const [cat, items] of Object.entries(iaResult)) {
    const catKey = cat === "pendências" ? "pendencias" : cat;
    const category = catKey as RestrictionCategory;
    if (!task.restrictions[category]) continue;
    const checklist: ChecklistItem[] = (items || []).map((item: any) => ({
      id: generateChecklistId(),
      descricao: item.descricao || "",
      categoria: category as ChecklistItem["categoria"],
      quantidadeEstimada: item.quantidadeEstimada ?? "",
      quantidadeConfirmada: item.quantidadeConfirmada !== false,
      responsavel: { nome: "", email: "" },
      status: "PENDENTE",
      prazoNecessario: "",
      guiaRemessa: null,
      planoManutencao: item.exigeManutencao ? { emDia: true, proximaData: "" } : null,
      notificacoes: { ultimoAlertaEnviado: "", tipoAlerta: "" },
      notas: "",
    }));
    task.restrictions[category].checklist = checklist;
  }
  recalcTaskStatus(task);
}

function toISODate(raw: unknown): string {
  if (typeof raw === "string") {
    const clean = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.substring(0, 10);
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().substring(0, 10);
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  }
  return "";
}

function mapStatusField(raw: unknown): "VERDE" | "AMARELO" | "VERMELHO" {
  const s = String(raw).trim().toUpperCase();
  if (s === "VERDE" || s === "GREEN") return "VERDE";
  if (s === "VERMELHO" || s === "RED") return "VERMELHO";
  return "AMARELO";
}

function mapOverallStatus(raw: unknown): CanonicalTask["status"] {
  const s = String(raw).trim().toUpperCase();
  if (s === "LIBERADO" || s === "LIBERADO_PLANEJAMENTO") return "LIBERADO_PLANEJAMENTO";
  if (s === "CONCLUIDO" || s === "CONCLUÍDO" || s === "DONE") return "CONCLUIDO";
  if (s === "PARADO" || s === "PARADO_CAMPO" || s === "BLOCKED") return "PARADO_CAMPO";
  return "PENDENTE";
}

function guessSector(_name: string, eap?: string, building?: string, storey?: string): string {
  return building || storey || eap || "Geral";
}

export function normalizeFromMemory(raw: any): CanonicalTask[] {
  if (!raw || !Array.isArray(raw)) return [];
  if (raw.length === 0) return [];

  const keys = Object.keys(raw[0] ?? {});
  const idKey = keys.find((k) => /^(id|código|codigo|code|eap)$/i.test(k)) ?? "";
  const nameKey = keys.find((k) => /^(name|nome|tarefa|task|atividade|descrição|descricao)$/i.test(k)) ?? "";
  const startKey = keys.find((k) => /^(start|inicio|início|data_inicio|data_ini)$/i.test(k)) ?? "";
  const endKey = keys.find((k) => /^(end|fim|término|termino|data_fim|data_fin)$/i.test(k)) ?? "";
  const sectorKey = keys.find((k) => /^(sector|setor|local|building|prédio|predio|torre|pavimento|storey)$/i.test(k)) ?? "";
  const statusKey = keys.find((k) => /^(status|situacao|situação|estado)$/i.test(k)) ?? "";

  const out: CanonicalTask[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const id = String(item[idKey] ?? item.id ?? item.codigo ?? "").trim();
    const name = String(item[nameKey] ?? item.name ?? item.tarefa ?? "").trim();
    if (!id && !name) continue;
    if (seen.has(id || name)) continue;
    seen.add(id || name);

    const task: CanonicalTask = {
      id: id || `TASK-${Math.random().toString(36).substring(2, 8)}`,
      name,
      start: toISODate(item[startKey] ?? item.start),
      end: toISODate(item[endKey] ?? item.end),
      sector: sectorKey ? String(item[sectorKey] ?? "").trim() : guessSector(name, item.eap, item.building, item.storey),
      status: statusKey ? mapOverallStatus(item[statusKey]) : "PENDENTE",
      restrictions: {
        projetos: { status: mapStatusField(item.projetos ?? item.restrictions?.projetos?.status ?? "AMARELO"), justificativa: "", checklist: item.restrictions?.projetos?.checklist ?? [] },
        materiais: { status: mapStatusField(item.materiais ?? item.restrictions?.materiais?.status ?? "AMARELO"), justificativa: "", checklist: item.restrictions?.materiais?.checklist ?? [] },
        equipamentos: { status: mapStatusField(item.equipamentos ?? item.restrictions?.equipamentos?.status ?? "AMARELO"), justificativa: "", checklist: item.restrictions?.equipamentos?.checklist ?? [] },
        seguranca: { status: mapStatusField(item.seguranca ?? item.restrictions?.seguranca?.status ?? "AMARELO"), justificativa: "", checklist: item.restrictions?.seguranca?.checklist ?? [] },
        pendencias: { status: "AMARELO", justificativa: "", checklist: [] },
      },
      fieldUpdate: defaultFieldUpdate(),
    };
    out.push(task);
  }
  return out;
}

export function normalizeFromCSV(rows: Record<string, string>[]): CanonicalTask[] {
  return normalizeFromMemory(rows);
}

export function normalizeFromElementTasks(tasks: any[]): CanonicalTask[] {
  if (!tasks || tasks.length === 0) return [];
  return tasks.map((t, i) => ({
    id: `TASK-${t.localId ?? i + 1}`,
    name: t.name || `Tarefa ${i + 1}`,
    start: toISODate(t.start),
    end: toISODate(t.finish),
    sector: guessSector(t.name, t.eap, t.building, t.storey),
    status: "PENDENTE" as const,
    restrictions: {
      projetos: defaultRestriction(),
      materiais: defaultRestriction(),
      equipamentos: defaultRestriction(),
      seguranca: defaultRestriction(),
      pendencias: defaultRestriction(),
    },
    fieldUpdate: defaultFieldUpdate(),
  }));
}

export function getWeekId(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((monday.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `W${weekNum}`;
}

export function getWeekRange(weekOffset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const targetMonday = new Date(monday);
  targetMonday.setDate(monday.getDate() + weekOffset * 7);
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  return {
    start: targetMonday,
    end: targetSunday,
    label: weekOffset === 0 ? "W+1 (Corrente)" : `W+${weekOffset + 1}`,
  };
}

export function filterTasksByWeek(tasks: CanonicalTask[], weekStart: Date, weekEnd: Date): CanonicalTask[] {
  return tasks.filter((t) => {
    if (!t.start) return false;
    const d = new Date(t.start);
    return d >= weekStart && d <= weekEnd;
  });
}

/** Motor de alertas: gera alertas baseados em prazos dos checklists */
export interface TaskAlert {
  taskId: string;
  taskName: string;
  checklistItemId: string;
  descricao: string;
  tipo: "MATERIAL_NAO_ENCOMENDADO" | "MATERIAL_SEM_ENTRADA_EM_OBRA" | "MANUTENCAO_EM_FALTA";
  categoria: RestrictionCategory;
}

export function computeAlerts(tasks: CanonicalTask[]): TaskAlert[] {
  const alerts: TaskAlert[] = [];
  const today = new Date();
  for (const task of tasks) {
    for (const cat of ALL_CATEGORIES) {
      for (const item of task.restrictions[cat].checklist || []) {
        if (!item.prazoNecessario) continue;
        const prazo = new Date(item.prazoNecessario);
        const diffDays = Math.ceil((prazo.getTime() - today.getTime()) / 86400000);

        if (item.status === "PENDENTE" && diffDays <= 5) {
          alerts.push({ taskId: task.id, taskName: task.name, checklistItemId: item.id, descricao: item.descricao, tipo: "MATERIAL_NAO_ENCOMENDADO", categoria: cat });
        }
        if (item.status === "ENCOMENDADO" && !item.guiaRemessa && diffDays <= 2) {
          alerts.push({ taskId: task.id, taskName: task.name, checklistItemId: item.id, descricao: item.descricao, tipo: "MATERIAL_SEM_ENTRADA_EM_OBRA", categoria: cat });
        }
        if (cat === "equipamentos" && item.planoManutencao && !item.planoManutencao.emDia) {
          alerts.push({ taskId: task.id, taskName: task.name, checklistItemId: item.id, descricao: item.descricao, tipo: "MANUTENCAO_EM_FALTA", categoria: cat });
        }
      }
    }
  }
  return alerts;
}
