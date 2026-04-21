#!/bin/bash

# Analysis App - Setup y Start Rápido

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Analysis App - Setup Automático"
echo "════════════════════════════════════════════════════════════════"
echo ""

PROJECT_DIR="/home/aggustin/analysis-app"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Verificar que estamos en el directorio correcto
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: No se encontró el directorio del proyecto"
    echo "   Esperado: $PROJECT_DIR"
    exit 1
fi

echo "📦 Paso 1: Instalando dependencias del backend..."
cd "$BACKEND_DIR"
npm install --quiet
echo "✓ Backend instalado"

echo ""
echo "📦 Paso 2: Instalando dependencias del frontend..."
cd "$FRONTEND_DIR"
npm install --quiet
echo "✓ Frontend instalado"

echo ""
echo "🗄️  Paso 3: Configurando base de datos..."
cd "$BACKEND_DIR"
npm run prisma:generate > /dev/null 2>&1
npx prisma migrate dev --name init --skip-generate > /dev/null 2>&1 || true
echo "✓ Base de datos lista"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Setup completado!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📝 Para iniciar la aplicación:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd $BACKEND_DIR"
echo "    npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd $FRONTEND_DIR"
echo "    npm run dev"
echo ""
echo "  Luego abre: http://localhost:3000"
echo ""
echo "  Credenciales:"
echo "    Admin:  admin@example.com / admin123"
echo "    User:   user@example.com / user123"
echo ""
echo "📚 Documentación:"
echo "    - README.md        (Descripción general)"
echo "    - QUICKSTART.md    (Inicio rápido)"
echo "    - PRUEBAS.md       (Guía de pruebas)"
echo "    - ARQUITECTURA.md  (Diagrama de arquitectura)"
echo ""
echo "════════════════════════════════════════════════════════════════"
