#!/bin/bash

echo "🔧 Configurando Analysis App..."
echo ""

# Backend setup
echo "📦 Configurando backend..."
cd backend
npm install

echo "🗄️  Preparando base de datos..."
npm run prisma:generate
npx prisma migrate dev --name init || echo "Migraciones completadas"

echo ""
echo "✅ Backend configurado"
echo ""

# Frontend setup
echo "⚛️  Configurando frontend..."
cd ../frontend
npm install

echo ""
echo "✅ Frontend configurado"
echo ""
echo "🎉 ¡Setup completado!"
echo ""
echo "Para iniciar la aplicación, ejecuta:"
echo "  cd /home/aggustin/analysis-app"
echo "  bash start.sh"
echo ""
