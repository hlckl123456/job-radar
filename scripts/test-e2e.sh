#!/bin/bash

# Run E2E tests for job-radar

set -e

echo "Running Job Radar E2E tests..."

# Ensure data directory exists
mkdir -p data e2e/artifacts

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Install Playwright browsers if needed
cd e2e
if [ ! -d "node_modules" ]; then
  pnpm install
fi
pnpm exec playwright install chromium

# Start API server in background
echo "Starting API server..."
cd ../app/api
pnpm dev > /dev/null 2>&1 &
API_PID=$!

# Start web server in background
echo "Starting web server..."
cd ../web
pnpm dev > /dev/null 2>&1 &
WEB_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Stopping servers..."
  kill $API_PID $WEB_PID 2>/dev/null
}

trap cleanup EXIT

# Wait for servers to be ready
echo "Waiting for servers to start..."
sleep 5

# Run Playwright tests
echo "Running Playwright tests..."
cd ../../e2e
pnpm exec playwright test

echo "E2E tests completed!"
