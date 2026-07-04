import type * as FRAGS from "@thatopen/fragments";
import { Viewer } from "./ifc/app";
import { buildSchedule, type ElementTask } from "./ifc/schedule";
import { Gantt } from "./ui/gantt";
import { buildShell } from "./ui/shell";
import { renderProperties, renderPropertiesMulti } from "./ui/properties";
import { renderTree, selectNodeById } from "./ui/tree";
import type { SpatialTreeItem } from "@thatopen/fragments";
import { initLookAhead } from "./lookahead-module/lookahead";
import { normalizeFromElementTasks } from "./lookahead-module/utils/dataAdapter";
import { getUser, showLogin, clearUser } from "./ui/login";
import type { UserInfo } from "./ui/login";

let user: UserInfo | null = getUser();
if (!user) {
  user = await new Promise<UserInfo>((resolve) => showLogin((u) => resolve(u)));
}

const root = document.getElementById("app")!;
const h = buildShell(root);

const viewer = new Viewer();
const gantt = new Gantt();
let _allTasks: ElementTask[] = [];

// Expõe dados do cronograma para o módulo Prévia
(window as any).ifc4all = {
  getCronograma: () => {
    if (_allTasks.length === 0) return [];
    return normalizeFromElementTasks(_allTasks);
  },
};

await viewer.init(h.viewportEl);

// ---- user menu handlers ----
document.getElementById("user-logout-btn")?.addEventListener("click", () => {
  clearUser();
  location.reload();
});
document.getElementById("user-settings-btn")?.addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "login-overlay";
  overlay.innerHTML = `
    <div class="login-card login-card-sm" style="text-align:left">
      <h2 style="font-size:18px;color:#fff;margin:0 0 16px">Definições da Conta</h2>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 4px">Nome</p>
      <p style="font-size:15px;color:#fff;margin:0 0 12px">${user!.name}</p>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 4px">E-mail</p>
      <p style="font-size:15px;color:#fff;margin:0 0 20px">${user!.email}</p>
      <button class="login-btn" style="margin-top:0">Fechar</button>
    </div>`;
  overlay.querySelector("button")!.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
});

// Favicon com P na Sifonn Outline
document.fonts.ready.then(() => {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.font = '28px "Sifonn Basic Outline", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("P", 16, 16);
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
  link.href = c.toDataURL("image/png");
});

async function selectAndShow(localId: number, model?: FRAGS.FragmentsModel) {
  await viewer.select(localId, model);
  const item = await viewer.getItemData(localId);
  renderProperties(h.propsEl, item);
}

viewer.canvas.addEventListener("click", async (e) => {
  const localId = await viewer.pickAt(e.clientX, e.clientY);
  if (localId == null) return;
  selectNodeById(h.treeEl, localId);
  await selectAndShow(localId);
});

// Aplica visibilidade a um lote de tarefas, agrupando por modelo (localId só é
// único dentro de cada modelo, então cada setVisible precisa do model certo).
function applyVisibility(tasks: ElementTask[], visible: boolean) {
  const byModel = new Map<FRAGS.FragmentsModel, number[]>();
  for (const t of tasks) {
    (byModel.get(t.model) ?? byModel.set(t.model, []).get(t.model)!).push(t.localId);
  }
  for (const [model, ids] of byModel) viewer.setElementsVisible(model, ids, visible);
}

/** Coleta localIds de todos os IfcBuildingStorey na árvore espacial. */
function collectStoreyIds(item: SpatialTreeItem): number[] {
  const ids: number[] = [];
  if (item.category === "IFCBUILDINGSTOREY" && item.localId != null) ids.push(item.localId);
  for (const c of item.children ?? []) ids.push(...collectStoreyIds(c));
  return ids;
}

// ── Toggle entre viewer 3D e Prévia ─────────────────────
let lookaheadActive = false;
let lookaheadContainer: HTMLElement | null = null;

root.addEventListener("open-lookahead", () => {
  lookaheadActive = !lookaheadActive;
  if (lookaheadActive) {
    document.querySelectorAll(".topbar-float, .panel, .panel-chip, .viewport").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });
    if (!lookaheadContainer) {
      lookaheadContainer = document.createElement("div");
      lookaheadContainer.id = "lookahead-root";
      root.appendChild(lookaheadContainer);
    }
    lookaheadContainer.style.display = "block";
    initLookAhead(
      lookaheadContainer,
      () => (window as any).ifc4all?.getCronograma?.() ?? [],
      () => {
        lookaheadActive = false;
        document.querySelectorAll(".topbar-float, .panel, .panel-chip, .viewport").forEach((el) => {
          (el as HTMLElement).style.display = "";
        });
        if (lookaheadContainer) lookaheadContainer.style.display = "none";
        const btn = document.getElementById("btn-lookahead");
        if (btn) btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><text x="12" y="18" text-anchor="middle" font-family="'Sifonn Basic Outline', 'Sifonn Basic', sans-serif" font-size="22" fill="white">P</text></svg>`;
      },
    );
  } else {
    document.querySelectorAll(".topbar-float, .panel, .panel-chip, .viewport").forEach((el) => {
      (el as HTMLElement).style.display = "";
    });
    if (lookaheadContainer) lookaheadContainer.style.display = "none";
  }
  const btn = document.getElementById("btn-lookahead");
  if (btn) btn.innerHTML = lookaheadActive ? "" : `<svg viewBox="0 0 24 24" width="18" height="18"><text x="12" y="18" text-anchor="middle" font-family="'Sifonn Basic Outline', 'Sifonn Basic', sans-serif" font-size="22" fill="white">P</text></svg>`;
});

h.fileInput.addEventListener("change", async () => {
  const files = [...(h.fileInput.files ?? [])];
  if (files.length === 0) return;
  h.treeEl.innerHTML = "";

  const allTasks: ElementTask[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const model = await viewer.loadIfc(bytes, file.name.replace(/\.ifc$/i, ""));
    if (!model) continue;
    allTasks.push(...(await buildSchedule(model)));

    const spatial = await viewer.getSpatial(model);
    if (spatial) {
      const storeyIds = collectStoreyIds(spatial);
      const labelMap = new Map<number, string>();
      if (storeyIds.length) {
        const data = await model.getItemsData(storeyIds, {
          attributesDefault: false,
          attributes: ["Name"],
        });
        for (let i = 0; i < storeyIds.length; i++) {
          const attrs = (data as any[])?.[i]?.attributes;
          const name = attrs?.Name;
          if (name) labelMap.set(storeyIds[i], String(name));
        }
      }

      const wrapper = document.createElement("div");
      wrapper.className = "tree-model";
      h.treeEl.appendChild(wrapper);
      renderTree(wrapper, file.name, spatial, {
        onSelect: (localId) => {
          selectAndShow(localId, model);
        },
        labelMap,
      });
    }
  }

  _allTasks = allTasks;
  gantt.render(h.ganttEl, allTasks, {
    onScrub: (_date, visible, hidden) => {
      applyVisibility(hidden, false);
      applyVisibility(visible, true);
    },
    onSelect: async (tasks) => {
      viewer.highlightElements(tasks);
      if (tasks.length === 0) {
        renderPropertiesMulti(h.propsEl, []);
        return;
      }
      const byModel = new Map<FRAGS.FragmentsModel, number[]>();
      for (const t of tasks) {
        (byModel.get(t.model) ?? byModel.set(t.model, []).get(t.model)!).push(t.localId);
      }
      const allItems: any[] = [];
      for (const [model, ids] of byModel) {
        const data = await model.getItemsData(ids, {
          attributesDefault: true,
          relations: {
            IsDefinedBy: { attributes: true, relations: true },
          },
        });
        allItems.push(...(data as any[]));
      }
      renderPropertiesMulti(h.propsEl, allItems);
    },
  });
});
