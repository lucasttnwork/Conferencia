// Introspeciona o Supabase (pg-meta) e salva JSONs na raiz do projeto
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (via ambiente ou .env)

require('dotenv').config()
const fs = require('fs')
const path = require('path')

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Falha ao buscar ${url}: ${res.status} ${res.statusText} ${text}`)
  }
  return res.json()
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Variáveis ausentes: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const headers = {
    'apikey': SERVICE_ROLE,
    'Authorization': `Bearer ${SERVICE_ROLE}`,
  }

  const base = SUPABASE_URL.replace(/\/$/, '')
  const endpoints = {
    tables: `${base}/pg/meta/tables?included_schemas=public&include_system_schemas=false`,
    views: `${base}/pg/meta/views?included_schemas=public&include_system_schemas=false`,
    columns: `${base}/pg/meta/columns?included_schemas=public`,
    foreign_keys: `${base}/pg/meta/foreign_keys?included_schemas=public`,
    openapi: `${base}/rest/v1/`,
  }

  console.log('Consultando metadados do Supabase...')
  let tables = []
  let views = []
  let columns = []
  let foreignKeys = []
  let openapi = null
  let dataSamples = {}

  // Tentar pg-meta (pode estar desabilitado)
  try { tables = await fetchJson(endpoints.tables, headers) } catch (e) { console.warn('pg-meta tables indisponível:', e.message) }
  try { views = await fetchJson(endpoints.views, headers) } catch (e) { console.warn('pg-meta views indisponível:', e.message) }
  try { columns = await fetchJson(endpoints.columns, headers) } catch (e) { console.warn('pg-meta columns indisponível:', e.message) }
  try { foreignKeys = await fetchJson(endpoints.foreign_keys, headers) } catch (e) { console.warn('pg-meta foreign_keys indisponível:', e.message); foreignKeys = [] }

  // Sempre tentar OpenAPI do PostgREST para listar recursos expostos
  try {
    const res = await fetch(endpoints.openapi, { headers: { ...headers, Accept: 'application/openapi+json' } })
    if (res.ok) {
      openapi = await res.json()
    } else {
      console.warn('OpenAPI não retornou 200:', res.status, res.statusText)
    }
  } catch (e) {
    console.warn('Falha ao obter OpenAPI:', e.message)
  }

  // Amostras de dados das principais tabelas se expostas no PostgREST
  const restHeaders = { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }
  const trySample = async (resource) => {
    try {
      const url = `${base}/rest/v1/${resource}?select=*&limit=100&order=created_at.desc.nullslast`
      const r = await fetch(url, { headers: restHeaders })
      if (r.ok) {
        dataSamples[resource] = await r.json()
      } else {
        console.warn('Falha ao obter sample de', resource, r.status, r.statusText)
      }
    } catch (e) {
      console.warn('Erro ao obter sample de', resource, e.message)
    }
  }
  await Promise.all(['lists', 'cards', 'card_events', 'card_movements'].map(trySample))

  const outDir = process.cwd()
  fs.writeFileSync(path.join(outDir, 'supabase_tables.json'), JSON.stringify(tables, null, 2), 'utf8')
  fs.writeFileSync(path.join(outDir, 'supabase_views.json'), JSON.stringify(views, null, 2), 'utf8')
  fs.writeFileSync(path.join(outDir, 'supabase_columns.json'), JSON.stringify(columns, null, 2), 'utf8')
  fs.writeFileSync(path.join(outDir, 'supabase_fks.json'), JSON.stringify(foreignKeys, null, 2), 'utf8')
  if (openapi) {
    fs.writeFileSync(path.join(outDir, 'supabase_openapi.json'), JSON.stringify(openapi, null, 2), 'utf8')
  }
  if (Object.keys(dataSamples).length > 0) {
    fs.writeFileSync(path.join(outDir, 'supabase_data_samples.json'), JSON.stringify(dataSamples, null, 2), 'utf8')
  }

  console.log('Arquivos gerados: supabase_tables.json, supabase_views.json, supabase_columns.json, supabase_fks.json' + (openapi ? ', supabase_openapi.json' : '') + (Object.keys(dataSamples).length ? ', supabase_data_samples.json' : ''))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


