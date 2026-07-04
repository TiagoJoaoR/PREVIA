import { getApiKey, setApiKey, getContacts } from "../store/localStorageEngine";
import {
  type CanonicalTask, type ChecklistItem, type RestrictionCategory,
  ALL_CATEGORIES, CATEGORY_LABELS, generateChecklistId, recalcTaskStatus,
} from "../utils/dataAdapter";
import { callCopilotCobranca, callChecklistPreditiva, callNotificarResponsavel } from "../utils/aiConnectors";

export function openRestrictionModal(
  task: CanonicalTask,
  onSave: (updated: CanonicalTask) => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "bs-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "bs-modal bs-modal-wide";

  const header = document.createElement("div");
  header.className = "bs-modal-header";

  const title = document.createElement("h3");
  title.className = "bs-modal-title";
  title.textContent = task.name;

  const closeBtn = document.createElement("button");
  closeBtn.className = "bs-modal-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => overlay.remove());

  header.append(title, closeBtn);

  const body = document.createElement("div");
  body.className = "bs-modal-body";

  const infoRow = document.createElement("div");
  infoRow.className = "bs-modal-info";
  infoRow.innerHTML = `<span class="bs-tag">${task.id}</span> <span>${task.sector}</span> <span>${task.start || "—"} → ${task.end || "—"}</span>`;
  body.appendChild(infoRow);

  const current: CanonicalTask = JSON.parse(JSON.stringify(task));

  const restrictionsGrid = document.createElement("div");
  restrictionsGrid.className = "bs-restrictions-grid";

  for (const cat of ALL_CATEGORIES) {
    const card = document.createElement("div");
    card.className = "bs-restriction-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "bs-restriction-card-header";
    const info = CATEGORY_LABELS[cat];
    cardHeader.textContent = `${info.icon} ${info.label}`;

    const statusBadge = document.createElement("span");
    const st = current.restrictions[cat].status;
    statusBadge.className = `bs-status-badge bs-status-${st.toLowerCase()}`;
    statusBadge.textContent = st;

    const aiGenBtn = document.createElement("button");
    aiGenBtn.className = "bs-btn bs-btn-sm bs-btn-ghost";
    aiGenBtn.textContent = "🤖 IA";
    aiGenBtn.title = "Gerar checklist preditiva para esta categoria";
    aiGenBtn.addEventListener("click", async () => {
      aiGenBtn.disabled = true;
      aiGenBtn.textContent = "⏳";
      try {
        const apiKey = resolveApiKey();
        if (!apiKey) { alert("Configure a chave de API primeiro."); return; }
        const result = await callChecklistPreditiva(current, apiKey);
        const catItems = (result[cat] || []).map((r: any) => ({
          id: generateChecklistId(),
          descricao: r.descricao || "",
          categoria: cat === "pendencias" ? "pendencias" : cat as ChecklistItem["categoria"],
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
        if (catItems.length > 0) {
          current.restrictions[cat].checklist = catItems;
          recalcTaskStatus(current);
          renderChecklist();
        }
      } catch (err: any) {
        alert(`Erro: ${err.message}`);
      } finally {
        aiGenBtn.disabled = false;
        aiGenBtn.textContent = "🤖 IA";
      }
    });

    const rechtHeader = document.createElement("div");
    rechtHeader.className = "bs-recht-header";
    rechtHeader.append(cardHeader, statusBadge, aiGenBtn);
    card.appendChild(rechtHeader);

    const checklistContainer = document.createElement("div");
    checklistContainer.className = "bs-checklist-container";

    function renderChecklist() {
      checklistContainer.innerHTML = "";
      const items = current.restrictions[cat].checklist || [];
      for (let i = 0; i < items.length; i++) {
        const row = createChecklistRow(items[i], cat, () => {
          recalcTaskStatus(current);
          renderChecklist();
        }, () => {
          current.restrictions[cat].checklist.splice(i, 1);
          recalcTaskStatus(current);
          renderChecklist();
        });
        checklistContainer.appendChild(row);
      }
    }

    renderChecklist();

    const addItemBtn = document.createElement("button");
    addItemBtn.className = "bs-btn bs-btn-sm bs-btn-secondary";
    addItemBtn.textContent = "+ Item";
    addItemBtn.addEventListener("click", () => {
      const newItem: ChecklistItem = {
        id: generateChecklistId(),
        descricao: "",
        categoria: cat === "pendencias" ? "pendencias" : cat as ChecklistItem["categoria"],
        quantidadeEstimada: "",
        quantidadeConfirmada: false,
        responsavel: { nome: "", email: "" },
        status: "PENDENTE",
        prazoNecessario: "",
        guiaRemessa: null,
        planoManutencao: null,
        notificacoes: { ultimoAlertaEnviado: "", tipoAlerta: "" },
        notas: "",
      };
      current.restrictions[cat].checklist.push(newItem);
      recalcTaskStatus(current);
      renderChecklist();
    });

    card.append(checklistContainer, addItemBtn);
    restrictionsGrid.appendChild(card);
  }

  body.appendChild(restrictionsGrid);

  const iaPanel = document.createElement("div");
  iaPanel.className = "bs-ia-panel";

  const iaHeader = document.createElement("div");
  iaHeader.className = "bs-ia-header";
  iaHeader.textContent = "🤖 Copiloto de Cobrança";

  const iaOutput = document.createElement("textarea");
  iaOutput.className = "bs-ia-output";
  iaOutput.placeholder = "Clique em 'Solicitar Resolução via IA' para gerar um texto de cobrança...";
  iaOutput.readOnly = true;

  const iaActions = document.createElement("div");
  iaActions.className = "bs-ia-actions";

  const genBtn = document.createElement("button");
  genBtn.className = "bs-btn bs-btn-primary";
  genBtn.textContent = "Solicitar Resolução via IA";
  genBtn.addEventListener("click", async () => {
    genBtn.disabled = true;
    genBtn.textContent = "Gerando...";
    try {
      const apiKey = resolveApiKey();
      if (!apiKey) { iaOutput.value = "⚠ Configure sua chave de API no topo da página primeiro."; return; }
      const text = await callCopilotCobranca(current, apiKey);
      iaOutput.value = text;
    } catch (err: any) {
      iaOutput.value = `⚠ Erro: ${err.message}`;
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = "Solicitar Resolução via IA";
    }
  });

  const copyBtn = document.createElement("button");
  copyBtn.className = "bs-btn bs-btn-secondary";
  copyBtn.textContent = "Copiar Texto";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(iaOutput.value).catch(() => {});
  });

  iaActions.append(genBtn, copyBtn);
  iaPanel.append(iaHeader, iaOutput, iaActions);
  body.appendChild(iaPanel);

  const footer = document.createElement("div");
  footer.className = "bs-modal-footer";

  const saveBtn = document.createElement("button");
  saveBtn.className = "bs-btn bs-btn-primary";
  saveBtn.textContent = "Salvar Modificações";
  saveBtn.addEventListener("click", () => {
    onSave(current);
    overlay.remove();
  });

  footer.appendChild(saveBtn);
  modal.append(header, body, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function createChecklistRow(
  item: ChecklistItem,
  category: RestrictionCategory,
  onChange: () => void,
  onDelete: () => void,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "bs-checklist-row";

  const descInput = document.createElement("input");
  descInput.className = "bs-checklist-desc";
  descInput.value = item.descricao;
  descInput.placeholder = "Descrição do item...";
  descInput.addEventListener("input", () => { item.descricao = descInput.value; onChange(); });

  const metaRow1 = document.createElement("div");
  metaRow1.className = "bs-checklist-meta";

  const statusSelect = document.createElement("select");
  statusSelect.className = "bs-checklist-status";
  ["PENDENTE", "ENCOMENDADO", "ENTREGUE", "CONCLUIDO", "BLOQUEADO"].forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    if (s === item.status) opt.selected = true;
    statusSelect.appendChild(opt);
  });
  statusSelect.addEventListener("change", () => { item.status = statusSelect.value as ChecklistItem["status"]; onChange(); });

  const prazoInput = document.createElement("input");
  prazoInput.type = "date";
  prazoInput.className = "bs-checklist-prazo";
  prazoInput.value = item.prazoNecessario;
  prazoInput.addEventListener("input", () => { item.prazoNecessario = prazoInput.value; onChange(); });

  metaRow1.append(statusSelect, prazoInput);
  if (category === "materiais" || category === "pendencias") {
    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.className = "bs-checklist-qty";
    qtyInput.value = item.quantidadeEstimada;
    qtyInput.placeholder = "Qtd";
    qtyInput.addEventListener("input", () => { item.quantidadeEstimada = qtyInput.value; onChange(); });
    metaRow1.appendChild(qtyInput);
  }

  const metaRow2 = document.createElement("div");
  metaRow2.className = "bs-checklist-meta";

  const respNome = document.createElement("input");
  respNome.className = "bs-checklist-resp-nome";
  respNome.value = item.responsavel.nome;
  respNome.placeholder = "Responsável";
  respNome.addEventListener("input", () => { item.responsavel.nome = respNome.value; onChange(); });

  const respEmail = document.createElement("input");
  respEmail.type = "email";
  respEmail.className = "bs-checklist-resp-email";
  respEmail.value = item.responsavel.email;
  respEmail.placeholder = "Email";
  respEmail.addEventListener("input", () => { item.responsavel.email = respEmail.value; onChange(); });

  const contacts = getContacts();
  if (contacts.length > 0) {
    const quickSelect = document.createElement("select");
    quickSelect.className = "bs-checklist-contacts";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "Contatos...";
    quickSelect.appendChild(emptyOpt);
    contacts.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.email;
      opt.textContent = c.nome;
      quickSelect.appendChild(opt);
    });
    quickSelect.addEventListener("change", () => {
      if (!quickSelect.value) return;
      const c = contacts.find((x) => x.email === quickSelect.value);
      if (c) {
        respNome.value = c.nome; item.responsavel.nome = c.nome;
        respEmail.value = c.email; item.responsavel.email = c.email;
        onChange();
      }
    });
    metaRow2.appendChild(quickSelect);
  }

  metaRow2.append(respNome, respEmail);

  const notificarBtn = document.createElement("button");
  notificarBtn.className = "bs-btn bs-btn-sm bs-btn-secondary";
  notificarBtn.textContent = "✉";
  notificarBtn.title = "Notificar responsável";
  notificarBtn.addEventListener("click", async () => {
    item.notificacoes.ultimoAlertaEnviado = new Date().toISOString();
    item.notificacoes.tipoAlerta = "email";
    onChange();
    const apiKey = resolveApiKey();
    const email = item.responsavel.email;
    if (!email) { alert("Preencha o email do responsável primeiro."); return; }
    const subject = encodeURIComponent(`[Alerta] ${item.descricao}`);
    if (apiKey) {
      try {
        const msg = await callNotificarResponsavel(
          item, { id: "lookahead", name: "" },
          item.responsavel, apiKey,
        );
        window.open(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(msg)}`);
        return;
      } catch {}
    }
    const body = encodeURIComponent(
      `Olá ${item.responsavel.nome},\n\nSolicitamos ação sobre: ${item.descricao}\nPrazo: ${item.prazoNecessario || "não definido"}\n\nPlanejamento`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  });

  metaRow2.appendChild(notificarBtn);

  const extrasRow = document.createElement("div");
  extrasRow.className = "bs-checklist-meta";

  if (category === "materiais") {
    const guiaNum = document.createElement("input");
    guiaNum.className = "bs-checklist-guia";
    guiaNum.value = item.guiaRemessa?.numero || "";
    guiaNum.placeholder = "Nº Guia";
    guiaNum.addEventListener("input", () => {
      if (!item.guiaRemessa) item.guiaRemessa = { numero: "", dataEntrada: "", evidenciaBase64: "" };
      item.guiaRemessa.numero = guiaNum.value;
      onChange();
    });

    const guiaData = document.createElement("input");
    guiaData.type = "date";
    guiaData.className = "bs-checklist-guia-data";
    guiaData.value = item.guiaRemessa?.dataEntrada || "";
    guiaData.addEventListener("input", () => {
      if (!item.guiaRemessa) item.guiaRemessa = { numero: "", dataEntrada: "", evidenciaBase64: "" };
      item.guiaRemessa.dataEntrada = guiaData.value;
      onChange();
    });

    extrasRow.append(guiaNum, guiaData);
  }

  if (category === "equipamentos") {
    const emDiaLabel = document.createElement("label");
    emDiaLabel.className = "bs-checklist-label";
    const emDiaCb = document.createElement("input");
    emDiaCb.type = "checkbox";
    emDiaCb.checked = item.planoManutencao?.emDia ?? true;
    emDiaCb.addEventListener("change", () => {
      if (!item.planoManutencao) item.planoManutencao = { emDia: true, proximaData: "" };
      item.planoManutencao.emDia = emDiaCb.checked;
      onChange();
    });
    emDiaLabel.append(emDiaCb, " Manut. OK");

    const proxManut = document.createElement("input");
    proxManut.type = "date";
    proxManut.className = "bs-checklist-manut-data";
    proxManut.value = item.planoManutencao?.proximaData || "";
    proxManut.addEventListener("input", () => {
      if (!item.planoManutencao) item.planoManutencao = { emDia: true, proximaData: "" };
      item.planoManutencao.proximaData = proxManut.value;
      onChange();
    });

    extrasRow.append(emDiaLabel, proxManut);
  }

  const notasInput = document.createElement("input");
  notasInput.className = "bs-checklist-notas";
  notasInput.value = item.notas;
  notasInput.placeholder = "Notas...";
  notasInput.addEventListener("input", () => { item.notas = notasInput.value; onChange(); });

  const delBtn = document.createElement("button");
  delBtn.className = "bs-btn bs-btn-sm bs-btn-danger";
  delBtn.textContent = "✕";
  delBtn.addEventListener("click", onDelete);

  row.append(descInput, metaRow1, metaRow2, extrasRow, notasInput, delBtn);
  return row;
}

function resolveApiKey(): string {
  const fromStorage = getApiKey();
  if (fromStorage) return fromStorage;
  const input = document.getElementById("bs-api-key") as HTMLInputElement;
  if (input && input.value.trim()) {
    setApiKey(input.value.trim());
    return input.value.trim();
  }
  return "";
}
