#!/usr/bin/env node
/*
  Aplica o conteúdo de dashboard_view.sql no projeto Supabase usando o token e project-ref do .cursor/mcp.json.
*/

const fs = require('fs')
const path = require('path')

async function main() {
  const mcpPath = path.resolve(__dirname, '..', '.cursor', 'mcp.json')
  if (!fs.existsSync(mcpPath)) {
    console.error('Arquivo .cursor/mcp.json não encontrado')
    process.exit(1)
  }
  const cfg = JSON.parse(fs.readFileSync(mcpPath, 'utf8'))
  const supa = cfg?.mcpServers?.supabase
  if (!supa) {
    console.error('Configuração do MCP Supabase não encontrada em .cursor/mcp.json')
    process.exit(1)
  }
  const token = supa.env?.SUPABASE_ACCESS_TOKEN
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN ausente em .cursor/mcp.json')
    process.exit(1)
  }
  let projectRef = null
  const args = Array.isArray(supa.args) ? supa.args : []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (typeof a === 'string' && a.startsWith('--project-ref')) {
      const parts = a.split('=')
      if (parts.length === 2 && parts[1]) {
        projectRef = parts[1]
      } else if (args[i + 1]) {
        projectRef = args[i + 1]
      }
      break
    }
  }
  if (!projectRef) {
    console.error('Project ref não encontrado nos args do MCP Supabase')
    process.exit(1)
  }

  const sqlPath = path.resolve(__dirname, '..', 'dashboard_view.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('dashboard_view.sql não encontrado na raiz do projeto')
    process.exit(1)
  }
  const query = fs.readFileSync(sqlPath, 'utf8')

  const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('Falha ao aplicar SQL:', resp.status, text)
    process.exit(1)
  }
  const data = await resp.json().catch(() => ({}))
  console.log('Views aplicadas com sucesso:', JSON.stringify(data))
}

main().catch(err => {
  console.error('Erro ao aplicar views:', err)
  process.exit(1)
})


