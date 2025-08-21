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

const transport = new StdioServerTransport();
await server.connect(transport);


