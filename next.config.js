/** @type {import('next').NextConfig} */
const nextConfig = {
  // Não inlinar variáveis de ambiente no build. Vamos ler de process.env em runtime.
  reactStrictMode: true,
}

module.exports = nextConfig
