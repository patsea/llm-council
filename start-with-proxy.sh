#!/bin/bash

# LLM Council - Start script with reverse proxy
# This script starts the backend, frontend, and a reverse proxy on port 80

echo "Starting LLM Council with reverse proxy..."
echo ""

# Check for hosts entry
if ! grep -q "llm-council.local" /etc/hosts 2>/dev/null; then
  echo "⚠️  WARNING: llm-council.local not found in /etc/hosts"
  echo "   Run this command first:"
  echo "   echo '127.0.0.1 llm-council.local' | sudo tee -a /etc/hosts"
  echo ""
fi

# Start backend
echo "Starting backend on http://localhost:8001..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
sleep 3

# Start reverse proxy (requires sudo for port 80)
echo "Starting reverse proxy on http://llm-council.local/ (port 80)..."
echo "This requires sudo access for port 80..."
sudo node proxy.js &
PROXY_PID=$!

echo ""
echo "✓ LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
echo "  Proxy:    http://llm-council.local/"
echo ""
echo "Access your app at: http://llm-council.local/"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; sudo kill $PROXY_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
