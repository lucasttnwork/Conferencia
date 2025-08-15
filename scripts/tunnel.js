const fs = require('fs')
const path = require('path')

async function main() {
  const localtunnel = require('localtunnel')
  const port = Number(process.env.PORT || 3000)
  const tunnel = await localtunnel({ port })
  const url = tunnel.url

  const outFile = path.join(process.cwd(), 'tunnel_url.txt')
  fs.writeFileSync(outFile, url, 'utf8')
  console.log('TUNNEL_URL=' + url)

  process.on('SIGINT', () => tunnel.close())
  process.on('SIGTERM', () => tunnel.close())

  tunnel.on('close', () => {
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})



