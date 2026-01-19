#!/bin/bash

# Start development servers for job-radar

echo "Starting Job Radar development servers..."

# Ensure data directory exists
mkdir -p data

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Start API server in background
echo "Starting API server on port 3001..."
cd app/api && pnpm dev &
API_PID=$!

# Start web server in background
echo "Starting web server on port 3000..."
cd app/web && pnpm dev &
WEB_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Stopping servers..."
  kill $API_PID $WEB_PID 2>/dev/null
  exit
}

trap cleanup SIGINT SIGTERM

echo ""
echo "Development servers running:"
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for any process to exit
wait
