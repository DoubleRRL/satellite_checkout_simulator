#!/bin/bash
set -e

echo "Activating virtual environment..."
source venv/bin/activate

echo "Generating telemetry data..."
python src/telemetry_generator.py

echo "Detecting anomalies..."
python src/anomaly_detector.py

echo "Checking for processes on port 5001..."
lsof -i :5001 | grep LISTEN | awk '{print $2}' | xargs -I {} kill -9 {} || true

echo "Starting Flask server in the background..."
python src/visualizer.py &

echo "Waiting for Flask to start..."
sleep 5

echo "Checking Flask health..."
curl -s http://localhost:5001/health || echo "Flask health check failed"

echo "Checking for processes on port 5176..."
lsof -i :5176 | grep LISTEN | awk '{print $2}' | xargs -I {} kill -9 {} || true

echo "Starting Vite frontend..."
cd frontend
npm run dev -- --port 5176 &

echo "Waiting for Vite to start..."
sleep 10

echo "Running tests..."
cd ..
PYTHONPATH=. pytest tests/ -v

echo "Setup complete! Dashboard at http://localhost:5176"