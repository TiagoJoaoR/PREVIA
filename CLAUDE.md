# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

Para evitar duplicação, a orientação completa vive em dois arquivos — **leia-os**:

- **[`agente.md`](agente.md)** — a especificação executável para **instalar e rodar**
  o `ifc4all` em `localhost`. O público-alvo é **leigo**: siga as *"Regras de conduta
  com público leigo"* (falar simples, ser autônomo no que é seguro, só pedir
  confirmação em ações de sistema/destrutivas). É o roteiro que o aluno dispara pelo
  OpenCode, mas vale para qualquer agente.
- **[`AGENTS.md`](AGENTS.md)** — a referência **técnica** do projeto: comandos,
  arquitetura (`main.ts → ifc/app.ts → ifc/schedule.ts → ui/gantt.ts`) e as
  **armadilhas** (lockstep de versões `@thatopen/*`/`three`/`web-ifc`, `WASM_PATH`,
  rede obrigatória em runtime, `build.target: "esnext"`, atributos de cronograma no
  IFC).

Resumo mínimo: app **client-side** (Vite + TypeScript) que vive em `viewer/`; todos
os comandos `npm` rodam de dentro de `viewer/`; **sem backend e sem Python** para
rodar; **não bumpar** as libs em lockstep por conta própria.
