# agente.md — Instalação Autônoma do ifc4all (para leigos, via OpenCode)

> **Para o ALUNO (leia só isto):** você não precisa entender nada de programação.
> Depois de baixar o projeto do GitHub e abri-lo no **OpenCode**, cole no chat do
> OpenCode **exatamente** o comando do quadro **MISSÃO** abaixo e aperte **Enter**.
> O OpenCode vai ler este arquivo inteiro e fazer o resto sozinho, explicando cada
> passo em português. Quando ele terminar, seu navegador vai abrir o ifc4all
> funcionando.
>
> **Para o AGENTE (OpenCode / Claude Code / etc.):** este arquivo é a sua
> especificação executável. **Leia-o por inteiro antes de agir.** Quem está do
> outro lado do chat é um aluno leigo — siga as *"Regras de conduta com público
> leigo"* logo abaixo da MISSÃO.

---

## MISSÃO (o aluno cola este texto no OpenCode)

> **Analise o arquivo `agente.md` e crie um plano passo a passo para executar todas
> as requisições apresentadas nesse arquivo, para que o software `ifc4all` rode de
> forma plena em `localhost`. Também analise as bibliotecas e as configurações
> atuais do sistema (a máquina onde o `ifc4all` está instalado) e instale/atualize
> tudo o que for necessário. Ao final, deixe o servidor rodando e um modelo IFC de
> exemplo carregado, com o Gantt 4D preenchido.**

---

## Regras de conduta com público leigo (o AGENTE deve seguir)

1. **Fale em português simples.** Nada de jargão. Antes de cada comando, diga em
   uma frase o que ele faz ("vou verificar qual versão do Node você tem").
2. **Seja autônomo no que é seguro.** Execute sem ficar perguntando: o diagnóstico
   (Fase 0), o `npm ci`/`npm install`, o `npm run dev`, os `typecheck`/`build`.
   O aluno não sabe responder detalhes técnicos — **não transfira decisões
   técnicas para ele**.
3. **Só peça confirmação em ações que mexem no sistema ou apagam coisas**, e quando
   pedir, explique em linguagem de leigo **e já dê a recomendação**. Exemplos que
   pedem confirmação: instalar ou trocar a versão do **Node.js**, **apagar**
   `node_modules`/`package-lock.json`, rodar `npm audit fix --force`. Formato:
   *"Sua versão do Node é muito antiga e o programa não vai rodar. Recomendo
   instalar o Node 20 (leva ~2 min). Posso prosseguir? (responda **sim** ou
   **não**)"*.
4. **Nunca deixe o aluno travado.** Se algo falhar, explique o que aconteceu em uma
   frase simples e diga qual é o próximo passo. Se precisar de uma ação manual do
   aluno (ex.: baixar um instalador), dê o link e instruções de clicar.
5. **Diagnostique antes de mexer.** Rode a Fase 0 inteira e **mostre o resumo** ao
   aluno antes de instalar/atualizar qualquer coisa.
6. **Respeite o "lockstep".** Nunca rode `npm update` cego nem atualize as libs
   `@thatopen/*`, `three` ou `web-ifc` por conta própria — veja *"Regras de ouro"*.
7. **Adapte os comandos ao sistema operacional.** O aluno provavelmente está no
   **Windows** (PowerShell). Use a coluna certa das tabelas de comandos.
8. **Só declare sucesso** depois de validar os *Critérios de sucesso* (Fase 5) com
   evidência real (saída dos comandos + modelo carregado na tela).

---

## Contexto do software

`ifc4all` é um web app que visualiza modelos **IFC** (BIM) com um cronograma **4D**
(Gantt tipo MS Project, ligado às datas do próprio modelo). É construído sobre as
bibliotecas open-source **That Open Components**.

- Todo o app vive em **`viewer/`** (uma SPA em **Vite + TypeScript**).
  **Todos os comandos `npm` rodam de dentro de `viewer/`.**
- A raiz do projeto guarda documentação, configuração e os modelos de exemplo
  (`ifc_model/`).
- É um app **100% client-side**: **não há backend, não há banco de dados, não usa
  Python para rodar**. "Rodar em localhost" significa apenas subir o **dev server
  do Vite** (porta `5173`).

---

## Como o projeto chega na máquina (pré-requisito da missão)

O aluno já deve ter o projeto na máquina. As duas formas válidas:

- **Via GitHub (recomendado):** `git clone https://github.com/bicalhobim/ifc4all.git`
- **Via ZIP:** botão verde **Code ▸ Download ZIP** no GitHub, e extrair.

Depois, o aluno abre **a pasta do projeto** no OpenCode. Se o agente perceber que a
pasta atual **não** contém `viewer/package.json`, deve avisar o aluno de que a pasta
aberta está errada e orientá-lo a abrir a pasta raiz do `ifc4all`.

---

## Sobre o OpenCode e o arquivo `opencode.json` (leia para não se assustar)

Na raiz existe um `opencode.json` que registra ferramentas extras do OpenCode
("MCPs"):

- **`playwright`** → baixado sob demanda via `npx`; serve para automação de
  navegador. É **opcional** para a missão. Se estiver disponível, o agente **pode**
  usá-lo para abrir `http://localhost:5173` e conferir visualmente que o modelo
  carregou. Se demorar para baixar ou não estiver disponível, **não bloqueia**:
  basta pedir ao aluno para confirmar o que vê na tela.

**O que o agente deve fazer:** se o OpenCode mostrar um aviso de que algum MCP está
baixando ou não iniciou, **ignore** — isso **não** impede o ifc4all de rodar.
**Não instale Python** para a missão; o foco é apenas o `viewer/`.

---

## Requisitos que o agente DEVE garantir

### A. Software base do sistema

| Item | Exigência | Como verificar | Observação |
|---|---|---|---|
| **Node.js** | **≥ 20** (ideal: 20 LTS, 22 LTS ou 24) | `node -v` | O projeto usa recursos modernos. O *self-check* de datas usa `node --experimental-strip-types`, que exige **Node ≥ 22.6** (ideal ≥ 24). Se o Node for **< 20**, atualizar é **obrigatório**. |
| **npm** | ≥ 10 (vem junto com o Node) | `npm -v` | Não instalar separado; acompanha o Node. |
| **Navegador** | Chrome/Edge/Firefox atuais | — | Precisa suportar WebGL2 e *top-level await*. |
| **Internet** | **Obrigatória em runtime** | — | O worker de fragments e o `.wasm` do web-ifc são baixados por `fetch` quando o viewer inicia. Sem internet, o viewer não sobe. |
| **git** | Opcional | `git --version` | Só necessário se for clonar via git em vez de baixar o ZIP. |
| **Python** | **Não é requisito** | — | O app não usa Python para rodar. |

### B. Dependências do projeto (versões TRAVADAS — não bumpar avulso)

Estas versões estão em **lockstep**. Elas são resolvidas pelo `npm install` a partir
do `package.json`/`package-lock.json` — o agente **não deve** trocá-las na mão.

| Pacote | Versão declarada | Papel |
|---|---|---|
| `@thatopen/components` | `^3.4.6` | Engine BIM (API "core" 3.x) |
| `@thatopen/fragments` | `^3.4.0` | Geometria/fragments (par do components) |
| `three` | `^0.182.0` | Render 3D |
| `web-ifc` | `0.0.77` (fixo) | Parser IFC em WASM |
| `camera-controls` | `^3.1.2` | Controle de câmera |
| `typescript` | `^5.6.0` | Compilador (dev) |
| `vite` | `^6.0.0` | Bundler / dev server (dev) |
| `@types/three` | `^0.182.0` | Tipos (dev) |

---

## Plano passo a passo de referência

O agente deve produzir seu próprio plano, mas ele **deve cobrir estas seis fases**.
Onde houver duas colunas de comando, use a do sistema do aluno.

### Fase 0 — Diagnóstico do sistema (NÃO instala nada ainda)

Objetivo: descobrir o que já existe e o que falta. Rode e reporte a saída.

**Versões das ferramentas** (igual nos dois sistemas):

```bash
node -v
npm -v
git --version    # opcional
```

**Checagens dentro do projeto** — escolha a coluna do seu sistema:

| Checagem | Windows (PowerShell) | macOS / Linux (bash) |
|---|---|---|
| Estou na pasta certa? | `Test-Path viewer\package.json` | `test -f viewer/package.json && echo ok` |
| `node_modules` já existe? | `Test-Path viewer\node_modules` | `test -d viewer/node_modules && echo presente` |
| Lockfile presente? | `Test-Path viewer\package-lock.json` | `test -f viewer/package-lock.json && echo presente` |
| Porta 5173 ocupada? | `Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue` | `lsof -i :5173` |

**Checagens de sanidade:**

- Comparar `node -v` com o requisito **≥ 20** (Tabela A). Se menor, planejar
  atualização do Node (Fase 1).
- Se `node_modules` já existir, conferir a integridade rodando, **dentro de
  `viewer/`**, `npm ls @thatopen/components three web-ifc`. Erros de *peer
  dependency* aqui indicam lockstep quebrado (tratar na Fase 2).

> **Entregue ao aluno um resumo curto do diagnóstico** (o que está OK, o que
> precisa instalar/atualizar) **antes de prosseguir.**

### Fase 1 — Preparar o ambiente base

- **Se o Node for < 20** (ou < 22.6, caso queira rodar o self-check de datas):
  instalar a versão **LTS**.
  - **Peça confirmação ao aluno** (ver Regra de conduta 3) antes de instalar/trocar.
  - **Windows:** o caminho mais simples para leigo é baixar o instalador em
    <https://nodejs.org> (botão **LTS**), abrir o `.msi` e clicar **Next** até o
    fim. (Se houver `winget`, uma alternativa é `winget install OpenJS.NodeJS.LTS`.)
  - **macOS/Linux:** `nvm install --lts` se houver nvm; senão, instalador do site.
  - Depois, **feche e reabra o terminal** e confirme com `node -v`.
- Se o Node já atender ao requisito, **não mexa** — pule esta fase.
- O npm acompanha o Node; **não instalar à parte**.

### Fase 2 — Instalar as dependências do projeto

Rode **de dentro de `viewer/`**:

```bash
cd viewer
npm ci        # instalação limpa e reproduzível a partir do lockfile (preferida)
# se não houver package-lock.json, use:  npm install
```

- **Prefira `npm ci`** quando existir `package-lock.json` — instala exatamente as
  versões travadas e é mais rápido.
- Se der **conflito de peer deps** (`ERESOLVE`): **não** force com `--force` às
  cegas. **Peça confirmação** e então apague `node_modules` + `package-lock.json` e
  rode `npm install` de novo. O conflito quase sempre vem de um bump parcial do
  lockstep.
- **Não** rode `npm audit fix --force` — pode subir *major* das libs e quebrar a API.

### Fase 3 — Subir em localhost e validar

```bash
cd viewer
npm run dev
```

- Esperado: log com `Local: http://localhost:5173/`.
- **Instrua o aluno em linguagem simples:** *"Abra o navegador em
  http://localhost:5173. Clique no botão de **Carregar arquivo** (ou arraste um
  arquivo) e escolha `ifc_model/TORRE02_ESTRUTURA_4D.ifc`. Espere alguns
  segundos."*
- Confirmar: o modelo 3D aparece **e** o Gantt embaixo fica preenchido (não "0
  elementos com cronograma").
- **Deixe o servidor rodando** ao final da missão (não encerre o processo).

### Fase 4 — (Opcional) Checagens de qualidade

```bash
cd viewer
npm run typecheck   # tsc --noEmit — não pode ter erro de tipo
npm run build       # tsc + vite build → dist/
npm run preview     # serve o build de produção em localhost
```

Self-check da lógica de datas (**só se Node ≥ 22.6**):

```bash
cd viewer
node --experimental-strip-types src/ifc/schedule.selfcheck.ts
```

### Fase 5 — Critérios de sucesso (Definition of Done)

Só declare a missão cumprida se **todos** forem verdadeiros, **com evidência**:

- [ ] `node -v` retorna **≥ 20**.
- [ ] `npm ci` (ou `npm install`) concluiu **sem erro de peer dependency**.
- [ ] `npm run dev` sobe e imprime `http://localhost:5173/`.
- [ ] A página abre no navegador **sem erro fatal** no console.
- [ ] Um IFC de `ifc_model/` carrega: **modelo 3D visível + Gantt 4D preenchido**.
- [ ] (Se aplicável) `npm run build` termina **sem erro de tipo**.

### Fase 6 — Fechamento para o aluno

Ao final, escreva ao aluno, em português simples:

- Que está tudo funcionando e o endereço para acessar (**http://localhost:5173**).
- Como recarregar depois: *"da próxima vez, é só rodar `npm run dev` dentro da pasta
  `viewer` — ou peça de novo ao OpenCode."*
- Um lembrete de que **precisa de internet** para carregar os modelos.

---

## Regras de ouro (o que ATUALIZAR vs. o que TRAVAR)

A missão pede para "instalar e atualizar tudo o que for necessário". Para **este**
projeto isso tem uma ressalva importante:

- ✅ **Atualizar o ambiente:** Node/npm para uma versão suportada, e o navegador.
- ✅ **Instalar as dependências** exatamente como o `package.json`/lockfile mandam
  (`npm ci` / `npm install`).
- ⛔ **NÃO atualizar as bibliotecas do projeto por conta própria.**
  `@thatopen/components`, `@thatopen/fragments`, `three` e `web-ifc` estão em
  **lockstep**. A API "core" (`fragments.core`, `model.getItemsData`,
  `getItemsOfCategories`) só existe na linha **3.x** do components; a 2.x é
  incompatível. Bumps parciais quebram o `npm install` ou a compilação.
- ⛔ **NÃO rodar** `npm update`, `npm audit fix --force`, nem trocar versões no
  `package.json` sem pedido explícito — **mesmo que o `npm audit` reclame**.

Subir de versão as libs é uma tarefa separada, feita com cuidado e testada — não faz
parte de "só instalar para rodar".

---

## Armadilhas específicas (ler antes de mexer em versões ou WASM)

- **`WASM_PATH` em `viewer/src/ifc/app.ts`** aponta para o CDN
  `unpkg.com/web-ifc@0.0.77/` e **precisa bater com a versão do `web-ifc`
  instalada**. Se um dia trocar o `web-ifc`, troque também esse path.
- **Rede em runtime:** o worker de fragments (`thatopen.github.io/.../worker.mjs`) e
  o WASM do web-ifc são baixados por `fetch` na inicialização. Sem internet, o viewer
  não sobe — **não é bug de instalação**.
- **Top-level await:** `main.ts` exige `build.target: "esnext"` no `vite.config.ts`
  — já configurado; **não rebaixar**.
- **IFC precisa dos atributos de cronograma** (`StartDate`, `FinishDate`, e
  idealmente `EAP`/`Prédio`/`Pavimento`) nos PSets, senão o Gantt fica vazio. Os
  IFCs de `ifc_model/` já vêm pré-processados com esses atributos.
- **PowerShell pode bloquear scripts:** se o Windows recusar rodar `npm` com um erro
  de *"execução de scripts está desabilitada"*, oriente o aluno a abrir o
  **PowerShell** e rodar, **uma única vez**:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (peça
  confirmação antes).

---

## Comandos disponíveis

Todos rodam **de dentro de `viewer/`**:

| Comando | O que faz |
|---|---|
| `npm ci` | Instalação limpa e reproduzível a partir do lockfile |
| `npm install` | Instala dependências (cria `node_modules/`) |
| `npm run dev` | Dev server Vite em `http://localhost:5173` |
| `npm run build` | `tsc` + `vite build` → `dist/` (falha se os tipos quebram) |
| `npm run preview` | Serve o build de produção em localhost |
| `npm run typecheck` | Só o `tsc --noEmit` |

---

## Troubleshooting

| Sintoma | Ação |
|---|---|
| **Pasta errada** ("não acho `package.json`") | Abra no OpenCode a **pasta raiz do ifc4all** (a que contém `viewer/`, `ifc_model/`, este `agente.md`). |
| **Gantt vazio ("0 elementos com cronograma")** | O IFC não tem `StartDate`/`FinishDate` nos PSets. Use um IFC de `ifc_model/`, que já vem pré-processado. |
| **"Erro ao carregar o modelo"** | Verifique a conexão com a internet — o WASM do web-ifc é baixado remotamente. |
| **`npm install` dá conflito (`ERESOLVE`)** | Peça confirmação, apague `node_modules` e `package-lock.json`, e rode `npm install` de novo. **Não** use `--force` às cegas. |
| **Porta 5173 em uso** | Encerre o processo que a ocupa ou ajuste `server.port` no `vite.config.ts`. |
| **Node muito antigo (< 20)** | Atualize o Node pela LTS em <https://nodejs.org> e **reabra o terminal**. |
| **`node --experimental-strip-types` falha** | Exige Node ≥ 22.6. Em Node mais antigo, esse self-check simplesmente não roda — **não bloqueia** o dev server. |
| **PowerShell recusa rodar `npm`** | Rode uma vez `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (com confirmação) e tente de novo. |
| **Aviso de MCP no OpenCode** | Normal. Os MCPs são opcionais e **não** fazem parte da missão; ignore o aviso. |
