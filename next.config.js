/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  // Não inlinar variáveis de ambiente no build. Vamos ler de process.env em runtime.
  reactStrictMode: true,
=======
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
>>>>>>> 9faaeadc2d8cb04ceb8537caaf5c55b02cd64a6a
}

module.exports = nextConfig
