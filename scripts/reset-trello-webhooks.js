// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config()

async function main() {
	const trelloKey = process.env.TRELLO_API_KEY
	const trelloToken = process.env.TRELLO_API_TOKEN
	const trelloBoardId = process.env.TRELLO_BOARD_ID
	let callbackURL
	// 1) Se existir um URL de túnel em arquivo, priorize-o (ambiente local)
	try {
		const fs = require('fs')
		const path = require('path')
		const tunnelPath = path.join(process.cwd(), 'tunnel_url.txt')
		if (fs.existsSync(tunnelPath)) {
			const tunnel = fs.readFileSync(tunnelPath, 'utf8').trim()
			if (tunnel) {
				callbackURL = `${tunnel.replace(/\/$/, '')}/api/trello/webhook`
			}
		}
	} catch {}
	// 2) Caso não exista túnel, use a variável de ambiente
	if (!callbackURL) {
		callbackURL = process.env.TRELLO_WEBHOOK_CALLBACK_URL
	}
	if (!callbackURL) {
		callbackURL = 'http://localhost:3000/api/trello/webhook'
	}

	console.log('callbackURL que será usado:', callbackURL)

	if (!trelloKey || !trelloToken) {
		console.error('Erro: TRELLO_API_KEY e/ou TRELLO_API_TOKEN não definidos no .env')
		process.exit(1)
	}
	if (!trelloBoardId) {
		console.error('Erro: TRELLO_BOARD_ID não definido no .env')
		process.exit(1)
	}

	console.log('Listando webhooks existentes para o token...')
	const listRes = await fetch(`https://api.trello.com/1/tokens/${trelloToken}/webhooks?key=${trelloKey}&token=${trelloToken}`)
	if (!listRes.ok) {
		const text = await listRes.text()
		console.error('Falha ao listar webhooks:', text)
		process.exit(1)
	}
	const webhooks = await listRes.json()
	console.log(`Encontrados ${webhooks.length} webhooks`) 
	for (const wh of webhooks) {
		console.log(`- ${wh.id} -> ${wh.callbackURL}`)
	}

	if (webhooks.length > 0) {
		console.log('Removendo webhooks...')
		for (const wh of webhooks) {
			const delRes = await fetch(`https://api.trello.com/1/webhooks/${wh.id}?key=${trelloKey}&token=${trelloToken}`, { method: 'DELETE' })
			if (!delRes.ok) {
				const text = await delRes.text()
				console.error(`Falha ao excluir webhook ${wh.id}:`, text)
			} else {
				console.log(`Excluído: ${wh.id}`)
			}
		}
	} else {
		console.log('Nenhum webhook para excluir.')
	}

	console.log('Registrando novo webhook...')
	const createRes = await fetch(`https://api.trello.com/1/webhooks/?key=${trelloKey}&token=${trelloToken}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			description: 'Webhook do Dashboard (local)',
			callbackURL,
			idModel: trelloBoardId,
			active: true,
		}),
	})
	if (!createRes.ok) {
		const text = await createRes.text()
		console.error('Falha ao criar webhook:', text)
		process.exit(1)
	}
	const created = await createRes.json()
	console.log('Webhook criado com sucesso:')
	console.log({ id: created.id, callbackURL: created.callbackURL })
}

main().catch((err) => {
	console.error('Erro inesperado:', err)
	process.exit(1)
})


