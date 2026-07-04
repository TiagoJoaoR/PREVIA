const STORAGE_KEY = "buildsafe_mvp_data";

export interface BuildSafeMetrics {
  ppcHistory: { week: string; value: number; failures: Record<string, number> }[];
}

export interface Contact {
  id: string;
  nome: string;
  email: string;
  funcao: string;
}

export interface BuildSafeData {
  config: { apiKey: string; provider: string };
  tasks: any[];
  metrics: BuildSafeMetrics;
  contacts: Contact[];
}

const defaultData: BuildSafeData = {
  config: { apiKey: "", provider: "openai" },
  tasks: [],
  metrics: { ppcHistory: [] },
  contacts: [
    { id: "c1", nome: "Diego (Eng. Planejamento)", email: "diego@obra.pt", funcao: "Planejamento" },
    { id: "c2", nome: "Mestre de Obra", email: "mestre@obra.pt", funcao: "Produção" },
    { id: "c3", nome: "Almoxarife", email: "almoxarife@obra.pt", funcao: "Logística" },
  ],
};

export function loadData(): BuildSafeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        config: { ...defaultData.config, ...parsed.config },
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        metrics: { ...defaultData.metrics, ...parsed.metrics },
        contacts: Array.isArray(parsed.contacts) ? parsed.contacts : defaultData.contacts,
      };
    }
  } catch {
    // corrupted data, reset
  }
  return { ...defaultData, config: { ...defaultData.config }, tasks: [], metrics: { ...defaultData.metrics }, contacts: [...defaultData.contacts] };
}

export function saveData(data: BuildSafeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getApiKey(): string {
  return loadData().config.apiKey;
}

export function setApiKey(key: string): void {
  const data = loadData();
  data.config.apiKey = key;
  data.config.provider = "openai";
  saveData(data);
}

export function getTasks(): any[] {
  return loadData().tasks;
}

export function setTasks(tasks: any[]): void {
  const data = loadData();
  data.tasks = tasks;
  saveData(data);
}

export function addPpcEntry(week: string, value: number, failures: Record<string, number>): void {
  const data = loadData();
  data.metrics.ppcHistory.push({ week, value, failures });
  saveData(data);
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getContacts(): Contact[] {
  return loadData().contacts;
}

export function setContacts(contacts: Contact[]): void {
  const data = loadData();
  data.contacts = contacts;
  saveData(data);
}

export function addContact(contact: Contact): void {
  const data = loadData();
  data.contacts.push(contact);
  saveData(data);
}
