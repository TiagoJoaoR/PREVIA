export async function callCopilotCobranca(
  task: { id: string; name: string; sector: string; start: string; restrictions: Record<string, any> },
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error("Chave de API não configurada");

  const pendentes: string[] = [];
  for (const [area, r] of Object.entries(task.restrictions)) {
    if (r.status !== "VERDE") pendentes.push(area);
  }

  const prompt = `Você é um assistente de cobrança corporativa para canteiro de obras.
Dados da tarefa:
- ID: ${task.id}
- Nome: ${task.name}
- Setor: ${task.sector}
- Data de início: ${task.start || "não definida"}
- Restrições pendentes: ${pendentes.length > 0 ? pendentes.join(", ") : "nenhuma (tudo verde)"}

Gere uma mensagem de e-mail profissional e educada para ser enviada ao fornecedor/responsável pelas restrições pendentes, solicitando urgência na resolução. A mensagem deve:
1. Ter assunto
2. Ser curta e profissional
3. Mencionar a data crítica
4. Incluir espaço para [NOME DO FORNECEDOR] e [ASSINATURA]
5. Não usar markdown

Mensagem:`;

  return callOpenAI(prompt, apiKey);
}

export async function callAnalistaSuprimentos(
  task: { id: string; name: string; sector: string; start: string },
  apiKey: string,
): Promise<{ projetos: string; materiais: string; equipamentos: string; seguranca: string }> {
  if (!apiKey) {
    return { projetos: "AMARELO", materiais: "AMARELO", equipamentos: "AMARELO", seguranca: "AMARELO" };
  }

  const prompt = `Você é um analista de suprimentos para construção civil.
Analise a seguinte tarefa de obra e classifique o risco de prontidão para cada insumo como VERDE (baixo risco), AMARELO (médio risco) ou VERMELHO (alto risco):

Tarefa: ${task.name}
Setor: ${task.sector}
Início: ${task.start || "não definido"}

Responda APENAS com um objeto JSON sem markdown:
{"projetos":"VERDE|AMARELO|VERMELHO","materiais":"VERDE|AMARELO|VERMELHO","equipamentos":"VERDE|AMARELO|VERMELHO","seguranca":"VERDE|AMARELO|VERMELHO"}`;

  try {
    const raw = await callOpenAI(prompt, apiKey);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      projetos: parsed.projetos || "AMARELO",
      materiais: parsed.materiais || "AMARELO",
      equipamentos: parsed.equipamentos || "AMARELO",
      seguranca: parsed.seguranca || "AMARELO",
    };
  } catch {
    return { projetos: "AMARELO", materiais: "AMARELO", equipamentos: "AMARELO", seguranca: "AMARELO" };
  }
}

export async function callTranscritorCampo(
  _audioBase64: string,
  apiKey: string,
): Promise<{ transcricao: string; causaRaiz: string }> {
  if (!apiKey) throw new Error("Chave de API não configurada");

  const prompt = `Você é um transcritor de relatos de campo em obra.
Transcreva o seguinte áudio para texto formal e identifique a causa raiz do problema.

Audio content (base64) não disponível na chamada; use o texto transcrito fornecido pelo usuário ou classifique como "não informado".

Responda APENAS com JSON sem markdown:
{"transcricao":"...texto formal...","causaRaiz":"...causa identificada..."}`;

  return callOpenAI(prompt, apiKey).then((raw) => {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return { transcricao: parsed.transcricao || "", causaRaiz: parsed.causaRaiz || "" };
    } catch {
      return { transcricao: cleaned, causaRaiz: "não identificada" };
    }
  });
}

/** Agente Gerador de Checklist Preditiva */
export async function callChecklistPreditiva(
  task: { id: string; name: string; sector: string; start: string; end: string },
  apiKey: string,
): Promise<Record<string, Array<{ descricao: string; quantidadeEstimada?: string; quantidadeConfirmada?: boolean; exigeManutencao?: boolean }>>> {
  if (!apiKey) return {};

  const prompt = `Você é um especialista em planeamento e logística de obras de construção civil, com conhecimento profundo de processos construtivos, materiais, equipamentos e normas de segurança em Portugal.

Analise a seguinte tarefa de cronograma:
- Nome da tarefa: ${task.name}
- Setor/Local: ${task.sector}
- Data de início: ${task.start}
- Data de fim: ${task.end}

Com base no tipo de tarefa, gere uma checklist detalhada e específica (não genérica) para cada uma das seguintes categorias:

1. MATERIAIS: liste cada material necessário individualmente (não agrupado), com uma estimativa de quantidade sempre que for possível inferir a partir do tipo e dimensão típica da tarefa. Se não for possível estimar com confiança, devolva quantidadeEstimada vazio e assinale quantidadeConfirmada como false.
2. EQUIPAMENTOS: liste cada equipamento necessário individualmente, assinalando se costuma exigir plano de manutenção periódico.
3. PROJETOS: liste os documentos ou aprovações de projeto que tipicamente precisam de estar disponíveis antes desta tarefa arrancar.
4. SEGURANCA: liste os requisitos de segurança específicos a este tipo de tarefa (EPIs, sinalização, PSS, etc).
5. PENDENCIAS: liste decisões ou definições em aberto que tipicamente bloqueiam este tipo de tarefa (ex: cor de acabamento, marca especificada, aprovação do dono de obra).

Responda apenas em JSON válido, sem markdown, sem comentários, seguindo exatamente este formato:
{
  "materiais": [ { "descricao": "Cimento Portland CEM II/B-L 32,5N", "quantidadeEstimada": "1200 kg", "quantidadeConfirmada": true } ],
  "equipamentos": [ { "descricao": "Betoneira 400L", "exigeManutencao": true } ],
  "projetos": [ { "descricao": "Projeto de estruturas aprovado" } ],
  "seguranca": [ { "descricao": "Capacete e botas de segurança" } ],
  "pendencias": [ { "descricao": "Definição da marca de cimento" } ]
}`;

  try {
    const raw = await callOpenAI(prompt, apiKey);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

/** Agente Redator de Logística para notificar responsável específico */
export async function callNotificarResponsavel(
  item: { descricao: string; categoria: string; prazoNecessario: string },
  task: { id: string; name: string },
  responsavel: { nome: string; email: string },
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error("Chave de API não configurada");

  const prompt = `Você é um assistente de logística corporativa para canteiro de obras.

Dados do item:
- Descrição: ${item.descricao}
- Categoria: ${item.categoria}
- Prazo necessário: ${item.prazoNecessario || "não definido"}

Dados da tarefa:
- ID: ${task.id}
- Nome: ${task.name}

Responsável: ${responsavel.nome} (${responsavel.email})

Gere uma mensagem de e-mail profissional, curta e educada, dirigida especificamente a ${responsavel.nome}, solicitando ação urgente sobre este item. A mensagem deve:
1. Ter assunto com o ID da tarefa
2. Ser pessoal (tratar pelo nome)
3. Mencionar o prazo
4. Não usar markdown

Mensagem:`;

  return callOpenAI(prompt, apiKey);
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
  });

  if (resp.status === 401) throw new Error("Chave de API inválida (401)");
  if (resp.status === 429) throw new Error("Limite de requisições excedido (429)");
  if (!resp.ok) throw new Error(`Erro na API: ${resp.status}`);

  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function loadXLSX(): Promise<void> {
  if ((window as any).XLSX) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar a biblioteca XLSX"));
    document.head.appendChild(s);
  });
}
