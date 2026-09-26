#!/bin/bash

set -e

echo "Killing previous instances..."
pkill -f "spring-boot:run" || true
pkill -f "vite" || true
sleep 2

echo "Building Java engine..."
cd packages/java/engine
mvn clean install
cd ../../..

echo "Installing node dependencies (workspace root)..."
npm install

echo "Starting backend server..."
cd apps/api/backend
mvn spring-boot:run &
BACKEND_PID=$!
cd ../../..

echo "Starting frontend dev server..."
npm run dev -w algo-frontend &
FRONTEND_PID=$!

echo ""
echo "✓ Backend running (PID: $BACKEND_PID)"
echo "✓ Frontend running (PID: $FRONTEND_PID)"
echo ""
echo "To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
