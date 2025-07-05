from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import logging
import os

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/telemetry": {"origins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"]}})

@app.route('/telemetry', methods=['GET'])
def get_telemetry():
    logger.debug("Entering /telemetry endpoint")
    try:
        csv_path = 'telemetry_with_anomalies.csv'
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found at {csv_path}")
            return jsonify({'error': f'{csv_path} not found'}), 500
        df = pd.read_csv(csv_path)
        logger.debug(f"Read CSV with {len(df)} rows")
        df['voltage'] = df['voltage'].astype(float)
        df['signal_strength'] = df['signal_strength'].astype(float)
        df['apogee'] = df['apogee'].astype(float)
        df['anomaly_score'] = df['anomaly_score'].astype(float)
        df['timestamp'] = pd.to_datetime(df['timestamp']).dt.strftime('%Y-%m-%dT%H:%M:%S')
        normal = df[df['anomaly'] == False][['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly_score']].to_dict(orient='records')
        anomalies = df[df['anomaly'] == True][['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly_score']].to_dict(orient='records')
        stats = {
            'voltage_mean': df['voltage'].mean(),
            'voltage_std': df['voltage'].std(),
            'signal_strength_mean': df['signal_strength'].mean(),
            'signal_strength_std': df['signal_strength'].std(),
            'apogee_mean': df['apogee'].mean(),
            'apogee_std': df['apogee'].std(),
        }
        logger.debug(f"Normal points: {len(normal)}, Anomalies: {len(anomalies)}")
        return jsonify({'normal': normal, 'anomalies': anomalies, 'stats': stats})
    except FileNotFoundError as e:
        logger.error(f"FileNotFoundError: {e}")
        return jsonify({'error': 'telemetry_with_anomalies.csv not found'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    logger.debug("Health check endpoint")
    return jsonify({'status': 'Flask is running'})

if __name__ == "__main__":
    logger.info("Starting Flask app")
    app.run(host='0.0.0.0', debug=True, port=5001)