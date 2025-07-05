import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    def __init__(self, data_path='satellite_telemetry.csv', output_path='telemetry_with_anomalies.csv'):
        self.df = pd.read_csv(data_path)
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.output_path = output_path

    def detect_anomalies(self):
        features = ['voltage', 'signal_strength', 'apogee']
        X = self.df[features]
        self.df['anomaly'] = self.model.fit_predict(X) == -1
        # Add anomaly scores (negative means anomaly, lower is more anomalous)
        self.df['anomaly_score'] = self.model.score_samples(X)
        self.df.to_csv(self.output_path, index=False)
        anomalies = self.df[self.df['anomaly']]
        return anomalies

if __name__ == "__main__":
    detector = AnomalyDetector()
    anomalies = detector.detect_anomalies()
    print(f"Found {len(anomalies)} anomalies:")
    print(anomalies.head())