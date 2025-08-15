import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const key = process.env.TRELLO_API_KEY
    const token = process.env.TRELLO_API_TOKEN
    const idModel = process.env.TRELLO_BOARD_ID
    const callbackURL = process.env.TRELLO_WEBHOOK_CALLBACK_URL

    if (!key || !token || !idModel || !callbackURL) {
      return NextResponse.json({ error: 'Variáveis do Trello ausentes' }, { status: 400 })
    }

    const res = await fetch(`https://api.trello.com/1/webhooks/?key=${key}&token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Webhook do Dashboard',
        callbackURL,
        idModel,
        active: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Falha ao registrar webhook', detail: text }, { status: 500 })
    }

    const json = await res.json()
    return NextResponse.json({ ok: true, webhook: json })
  } catch (error) {
    console.error('Erro ao registrar webhook', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}


