// Servidor MCP para Trello (stdio)
// Exponde a ferramenta "trello_count_cards_in_list" que conta cards por nome de lista

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

async function loadDotEnvInto(envObj) {
  // Carrega chaves do arquivo .env do projeto (raiz) se existir
  try {
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const rootEnvPath = path.resolve(__dirname, "../.env");
    const stat = await fs.stat(rootEnvPath).catch(() => null);
    if (!stat || !stat.isFile()) return envObj;
    const content = await fs.readFile(rootEnvPath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const raw of lines) {
      if (!raw) continue;
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx < 1) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && typeof envObj[key] === "undefined") {
        envObj[key] = value;
      }
    }
  } catch {
    // Ignorar erros de leitura do .env
  }
  return envObj;
}

function qs(params) {
  return new URLSearchParams(params).toString();
}

async function countCardsInListByName({ listName, boardId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  const board = boardId || env.TRELLO_BOARD_ID;
  if (!key || !token || !board) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env: TRELLO_API_KEY and TRELLO_API_TOKEN (or TRELLO_TOKEN) and TRELLO_BOARD_ID",
        },
      ],
    };
  }

  const listsRes = await fetch(
    `https://api.trello.com/1/boards/${encodeURIComponent(board)}/lists?` +
      qs({ key, token, fields: "name,closed", limit: "1000" })
  );
  if (!listsRes.ok) {
    const msg = await listsRes.text().catch(() => listsRes.statusText);
    return { content: [{ type: "text", text: `Erro ao listar listas: ${listsRes.status} ${msg}` }] };
  }
  const lists = await listsRes.json();
  const target = Array.isArray(lists)
    ? lists.find((l) => (l?.name || "").toLowerCase() === String(listName).toLowerCase() && !l?.closed)
    : null;
  if (!target) {
    return { content: [{ type: "text", text: "0" }] };
  }

  const cardsRes = await fetch(
    `https://api.trello.com/1/lists/${encodeURIComponent(target.id)}/cards?` +
      qs({ key, token, fields: "id", limit: "1000" })
  );
  if (!cardsRes.ok) {
    const msg = await cardsRes.text().catch(() => cardsRes.statusText);
    return { content: [{ type: "text", text: `Erro ao listar cards: ${cardsRes.status} ${msg}` }] };
  }
  const cards = await cardsRes.json();
  const count = Array.isArray(cards) ? cards.length : 0;
  return { content: [{ type: "text", text: String(count) }] };
}

async function listBoards() {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env: TRELLO_API_KEY and TRELLO_API_TOKEN (or TRELLO_TOKEN)",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/members/me/boards?` +
      qs({ key, token, fields: "id,name,closed,shortUrl", limit: "1000" })
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao listar boards: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function listListsInBoard({ boardId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  const board = boardId || env.TRELLO_BOARD_ID;
  if (!key || !token || !board) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env: TRELLO_API_KEY and TRELLO_API_TOKEN (or TRELLO_TOKEN) and TRELLO_BOARD_ID",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/boards/${encodeURIComponent(board)}/lists?` +
      qs({ key, token, fields: "id,name,closed,pos", limit: "1000" })
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao listar listas: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function listCardsInList({ listId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token || !listId) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), listId",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/lists/${encodeURIComponent(listId)}/cards?` +
      qs({ key, token, fields: "id,name,shortUrl", limit: "1000" })
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao listar cards: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function createCard({ listId, name, desc }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token || !listId || !name) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), listId, name",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/cards?` +
      qs({ key, token, idList: listId, name, ...(desc ? { desc } : {}) })
  , { method: "POST" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao criar card: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function moveCardToList({ cardId, listId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token || !cardId || !listId) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), cardId, listId",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/cards/${encodeURIComponent(cardId)}?` +
      qs({ key, token, idList: listId })
  , { method: "PUT" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao mover card: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function addCommentToCard({ cardId, text }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token || !cardId || !text) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), cardId, text",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/cards/${encodeURIComponent(cardId)}/actions/comments?` +
      qs({ key, token, text })
  , { method: "POST" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao comentar no card: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function archiveCard({ cardId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  if (!key || !token || !cardId) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), cardId",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/cards/${encodeURIComponent(cardId)}?` +
      qs({ key, token, closed: "true" })
  , { method: "PUT" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao arquivar card: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

async function findCardsByName({ boardId, query, limit }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  const board = boardId || env.TRELLO_BOARD_ID;
  if (!key || !token || !board || !query) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), TRELLO_BOARD_ID, query",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/search?` +
      qs({
        key,
        token,
        query,
        idBoards: board,
        modelTypes: "cards",
        card_fields: "id,name,shortUrl,idList",
        cards_limit: String(limit || 20),
      })
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro na busca de cards: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json?.cards || []) }] };
}

async function getBoardMembers({ boardId }) {
  const env = await loadDotEnvInto({ ...process.env });
  const key = env.TRELLO_API_KEY;
  const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN;
  const board = boardId || env.TRELLO_BOARD_ID;
  if (!key || !token || !board) {
    return {
      content: [
        {
          type: "text",
          text: "Missing env/args: TRELLO_API_KEY, TRELLO_API_TOKEN (or TRELLO_TOKEN), TRELLO_BOARD_ID",
        },
      ],
    };
  }
  const res = await fetch(
    `https://api.trello.com/1/boards/${encodeURIComponent(board)}/members?` +
      qs({ key, token, fields: "id,username,fullName" })
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return { content: [{ type: "text", text: `Erro ao listar membros: ${res.status} ${msg}` }], isError: true };
  }
  const json = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

// Cria servidor MCP de alto nível via stdio
const server = new McpServer(
  { name: "trello-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.tool(
  "trello_count_cards_in_list",
  "Conta a quantidade de cards em uma lista do Trello por nome. Usa TRELLO_BOARD_ID por padrão.",
  {
    listName: z.string().describe("Nome exato da lista (case-insensitive)"),
    boardId: z.string().optional().describe("ID do board; se omitido, usa TRELLO_BOARD_ID"),
  },
  async ({ listName, boardId }) => {
    try {
      return await countCardsInListByName({ listName, boardId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_list_boards",
  "Lista os boards acessíveis pelo token atual.",
  {},
  async () => {
    try {
      return await listBoards();
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_list_lists",
  "Lista as listas de um board. Usa TRELLO_BOARD_ID por padrão.",
  {
    boardId: z.string().optional().describe("ID do board; se omitido, usa TRELLO_BOARD_ID"),
  },
  async ({ boardId }) => {
    try {
      return await listListsInBoard({ boardId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_list_cards_in_list",
  "Lista os cards de uma lista pelo ID da lista.",
  {
    listId: z.string().describe("ID da lista"),
  },
  async ({ listId }) => {
    try {
      return await listCardsInList({ listId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_create_card",
  "Cria um card em uma lista.",
  {
    listId: z.string().describe("ID da lista"),
    name: z.string().describe("Nome do card"),
    desc: z.string().optional().describe("Descrição do card"),
  },
  async ({ listId, name, desc }) => {
    try {
      return await createCard({ listId, name, desc });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_move_card_to_list",
  "Move um card para outra lista.",
  {
    cardId: z.string().describe("ID do card"),
    listId: z.string().describe("ID da lista destino"),
  },
  async ({ cardId, listId }) => {
    try {
      return await moveCardToList({ cardId, listId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_add_comment_to_card",
  "Adiciona um comentário a um card.",
  {
    cardId: z.string().describe("ID do card"),
    text: z.string().describe("Texto do comentário"),
  },
  async ({ cardId, text }) => {
    try {
      return await addCommentToCard({ cardId, text });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_archive_card",
  "Arquiva (fecha) um card.",
  {
    cardId: z.string().describe("ID do card"),
  },
  async ({ cardId }) => {
    try {
      return await archiveCard({ cardId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_find_cards_by_name",
  "Busca cards por nome no board. Usa TRELLO_BOARD_ID por padrão.",
  {
    query: z.string().describe("Texto para busca (nome do card)"),
    boardId: z.string().optional().describe("ID do board; se omitido, usa TRELLO_BOARD_ID"),
    limit: z.number().int().optional().describe("Limite de cards retornados (default 20)"),
  },
  async ({ boardId, query, limit }) => {
    try {
      return await findCardsByName({ boardId, query, limit });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "trello_get_board_members",
  "Lista os membros de um board. Usa TRELLO_BOARD_ID por padrão.",
  {
    boardId: z.string().optional().describe("ID do board; se omitido, usa TRELLO_BOARD_ID"),
  },
  async ({ boardId }) => {
    try {
      return await getBoardMembers({ boardId });
    } catch (err) {
      const message = err?.message || String(err);
      return { content: [{ type: "text", text: `Erro: ${message}` }], isError: true };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);


