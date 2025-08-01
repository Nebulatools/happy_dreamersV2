#!/bin/bash

# Script para ejecutar la creación de datos de prueba
# Ejecutar con: bash scripts/run.sh

echo "🚀 Ejecutando creación de datos de prueba..."
echo "📅 Período: 1 mayo 2025 - 31 julio 2025"
echo "👤 Usuario: 688ce146d2d5ff9616549d86"
echo ""

# Cargar variables de entorno
if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

# Ejecutar el script
node scripts/create-test-data.js

echo ""
echo "✅ Script completado!"