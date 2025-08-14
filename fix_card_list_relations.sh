#!/bin/bash

# Script para corrigir relacionamentos entre cards e lists no Supabase
# Autor: Sistema de Correção Automática
# Data: $(date)

echo "🔧 CORREÇÃO DE RELACIONAMENTOS ENTRE CARDS E LISTS"
echo "=================================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📋 Copiando env.example para .env..."
    cp env.example .env
    echo "✅ Arquivo .env criado. Por favor, edite-o com suas credenciais do Supabase"
    echo "   Depois execute este script novamente."
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
    echo "✅ Dependências instaladas com sucesso!"
fi

# Verificar se @supabase/supabase-js está instalado
if ! npm list @supabase/supabase-js > /dev/null 2>&1; then
    echo "📦 Instalando @supabase/supabase-js..."
    npm install @supabase/supabase-js
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar @supabase/supabase-js"
        exit 1
    fi
    echo "✅ @supabase/supabase-js instalado com sucesso!"
fi

echo ""
echo "🚀 Iniciando correção dos relacionamentos..."
echo ""

# Executar o script de correção rápida
echo "🔧 Executando correção automática..."
npx ts-node src/08_quick_fix_card_list_relations.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Correção concluída com sucesso!"
    echo ""
    echo "📊 Para verificar detalhes, execute:"
    echo "   npx ts-node src/06_verify_and_fix_card_list_relations.ts"
    echo ""
    echo "🔍 Para análise SQL detalhada, use o arquivo:"
    echo "   src/07_sql_card_list_verification.sql"
else
    echo ""
    echo "❌ Erro durante a correção. Verifique os logs acima."
    echo ""
    echo "🔄 Tentando correção detalhada..."
    npx ts-node src/06_verify_and_fix_card_list_relations.ts
fi

echo ""
echo "🏁 Processo finalizado!"
