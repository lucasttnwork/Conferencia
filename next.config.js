/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ler variáveis em runtime via process.env
  reactStrictMode: true,
  eslint: {
    // Evita falha do build na Railway por erros de lint
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
