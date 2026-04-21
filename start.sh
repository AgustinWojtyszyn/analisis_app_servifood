# Script para iniciar ambos servidores

echo "🚀 Iniciando Analysis App..."
echo ""

# Iniciar backend en background
echo "📦 Iniciando backend en http://localhost:5000..."
cd backend
npm run dev &
BACKEND_PID=$!

# Esperar un poco para que el backend inicie
sleep 3

# Iniciar frontend
echo "⚛️  Iniciando frontend en http://localhost:3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servidores iniciados:"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores"
echo ""

# Mantener los procesos en ejecución
wait $BACKEND_PID $FRONTEND_PID
