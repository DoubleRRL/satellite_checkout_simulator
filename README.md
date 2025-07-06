# Satellite Checkout Simulator

Welcome to the Satellite Checkout Simulator, a real-time telemetry dashboard built to monitor satellite health with style! 🚀 This project tracks voltage, signal strength, and apogee, flagging anomalies with AI-powered insights.

## Features
- **Real-Time Charts**: Visualize voltage, signal strength, and apogee over time using interactive Scatter charts.
- **Anomaly Detection**: Highlights anomalies with detailed analysis panels, including z-scores and percentiles.
- **Clickable Ribbons**: Quick-access stats with navigation through detected anomalies.
- **Responsive Design**: Works smoothly across devices with a clean, spaced-out layout.

## Tech Stack
- **Frontend**: React, Chart.js, Tailwind CSS
- **Backend**: Flask API (local at `http://localhost:5001/telemetry`)
- **Tools**: Vite, Git, GitLens (VS Code)

## Setup

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/DoubleRRL/satellite_checkout_simulator.git
   cd satellite_checkout_simulator

2. Install Dependencies:
Frontend: npm install
Backend: Set up a Python venv and install requirements (e.g., pip install flask).

3. Run the Project:
Start the Flask server: python backend/app.py (adjust path as needed).
Launch the frontend: npm run dev -- --port 5176.
Open http://127.0.0.1:5176 in your browser (Safari/Brave recommended).

## Usage
Click chart points for AI analysis (z-scores, percentiles, insights).
Use the “Anomalies Detected” ribbon to dive into anomaly details with navigation.
Check the console for raw API data logs.
Development
Contributing: Fork, tweak, and PR—let’s make it epic!
Issues: Report bugs or suggest features on the Issues tab.
