const fs = require('fs')
const path = require('path')
const ngrok = require('ngrok')

async function main() {
  const port = Number(process.env.PORT || 3000)
  const authtoken = process.env.NGROK_AUTHTOKEN
  if (authtoken) {
    try {
      await ngrok.authtoken(authtoken)
    } catch (err) {
      console.error('Falha ao aplicar NGROK_AUTHTOKEN:', err)
    }
  }

  const url = await ngrok.connect({ addr: port, proto: 'http' })
  const outFile = path.join(process.cwd(), 'tunnel_url.txt')
  fs.writeFileSync(outFile, url, 'utf8')
  console.log('TUNNEL_URL=' + url)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


