import { type CanonicalTask } from "../utils/dataAdapter";
import { addPpcEntry } from "../store/localStorageEngine";

const R_KEYS: (keyof CanonicalTask["restrictions"])[] = ["projetos", "materiais", "equipamentos", "seguranca"];
const R_LABELS: Record<string, string> = { projetos: "P", materiais: "M", equipamentos: "E", seguranca: "S" };

function isAllGreen(task: CanonicalTask): boolean {
  return R_KEYS.every((k) => task.restrictions[k].status === "VERDE");
}

function getWeekId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `W${weekNum}`;
}

export function renderFieldMestreView(
  container: HTMLElement,
  tasks: CanonicalTask[],
  onTasksUpdate: (tasks: CanonicalTask[]) => void,
): void {
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "bs-field-header";
  header.innerHTML = `<h2>🏗️ Visão do Mestre</h2><p class="bs-field-subtitle">Atividades liberadas para execução</p>`;
  container.appendChild(header);

  const liberadas = tasks.filter(isAllGreen);

  if (liberadas.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bs-field-empty";
    empty.innerHTML = "<p>✅ Nenhuma atividade 100% liberada no momento.</p><p>Volte ao Kanban e libere as restrições pendentes.</p>";
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "bs-field-list";

  for (const task of liberadas) {
    const card = document.createElement("div");
    card.className = "bs-field-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "bs-field-card-header";
    cardHeader.innerHTML = `<strong>${task.name}</strong> <span class="bs-tag bs-tag-green">${task.id}</span>`;
    card.appendChild(cardHeader);

    const cardMeta = document.createElement("div");
    cardMeta.className = "bs-field-card-meta";
    cardMeta.textContent = `${task.sector} · ${task.start || "—"} → ${task.end || "—"}`;
    card.appendChild(cardMeta);

    const dots = document.createElement("div");
    dots.className = "bs-dots";
    for (const key of R_KEYS) {
      const dot = document.createElement("span");
      dot.className = "bs-dot";
      dot.textContent = R_LABELS[key];
      dot.style.backgroundColor = "#22c55e";
      dot.title = `${key}: VERDE`;
      dots.appendChild(dot);
    }
    card.appendChild(dots);

    const actions = document.createElement("div");
    actions.className = "bs-field-actions";

    const concluirBtn = document.createElement("button");
    concluirBtn.className = "bs-btn bs-btn-primary bs-btn-lg";
    concluirBtn.textContent = "✓ Concluir Atividade";
    concluirBtn.addEventListener("click", () => {
      task.status = "CONCLUIDO";
      const week = getWeekId();
      addPpcEntry(week, 100, {});
      onTasksUpdate(tasks);
      renderFieldMestreView(container, tasks, onTasksUpdate);
    });

    const bloquearBtn = document.createElement("button");
    bloquearBtn.className = "bs-btn bs-btn-danger bs-btn-lg";
    bloquearBtn.textContent = "✕ Reportar Bloqueio";
    bloquearBtn.addEventListener("click", () => {
      const gaveta = document.createElement("div");
      gaveta.className = "bs-field-gaveta";
      gaveta.innerHTML = `
        <textarea class="bs-field-report" placeholder="Descreva o bloqueio..."></textarea>
        <button class="bs-btn bs-btn-danger bs-btn-sm" data-enviar>Enviar Reporte</button>
        <button class="bs-btn bs-btn-secondary bs-btn-sm" data-cancelar>Cancelar</button>
      `;
      actions.replaceWith(gaveta);

      gaveta.querySelector("[data-enviar]")?.addEventListener("click", () => {
        const texto = (gaveta.querySelector(".bs-field-report") as HTMLTextAreaElement)?.value || "Bloqueio reportado";
        task.status = "PARADO_CAMPO";
        task.fieldUpdate.statusCampo = texto;
        const week = getWeekId();
        addPpcEntry(week, 0, { materiais: 0 });
        onTasksUpdate(tasks);
        renderFieldMestreView(container, tasks, onTasksUpdate);
      });

      gaveta.querySelector("[data-cancelar]")?.addEventListener("click", () => {
        gaveta.replaceWith(actions);
      });
    });

    const gravarBtn = document.createElement("button");
    gravarBtn.className = "bs-btn bs-btn-secondary bs-btn-lg";
    gravarBtn.textContent = "🎤 Gravar Justificativa por Voz";
    gravarBtn.addEventListener("click", () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Gravação de áudio não suportada neste navegador.");
        return;
      }
      gravarBtn.disabled = true;
      gravarBtn.textContent = "🔴 Gravando... Clique para parar";
      let mediaRecorder: MediaRecorder | null = null;
      const chunks: Blob[] = [];

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onload = () => {
              task.fieldUpdate.evidenciaBase64 = reader.result as string;
              task.fieldUpdate.timestamp = new Date().toISOString();
              gravarBtn.disabled = false;
              gravarBtn.textContent = "🎤 Gravar Justificativa por Voz";
              alert("Áudio gravado com sucesso!");
              onTasksUpdate(tasks);
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach((t) => t.stop());
          };
          mediaRecorder.start();
        })
        .catch(() => {
          gravarBtn.disabled = false;
          gravarBtn.textContent = "🎤 Gravar Justificativa por Voz";
          alert("Permissão de microfone negada.");
        });

      gravarBtn.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, { once: true });
    });

    actions.append(concluirBtn, bloquearBtn, gravarBtn);
    card.appendChild(actions);
    list.appendChild(card);
  }

  container.appendChild(list);

  const ppcSection = document.createElement("div");
  ppcSection.className = "bs-field-ppc";
  const concluidas = liberadas.filter((t) => t.status === "CONCLUIDO").length;
  const total = liberadas.length;
  const ppc = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  ppcSection.innerHTML = `<h3>PPC - Percentual de Planos Concluídos</h3><div class="bs-ppc-bar"><div class="bs-ppc-fill" style="width:${ppc}%"></div></div><p>${concluidas}/${total} atividades concluídas (${ppc}%)</p>`;
  container.appendChild(ppcSection);
}
