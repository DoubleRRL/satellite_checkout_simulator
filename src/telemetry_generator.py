import pandas as pd
import numpy as np

class TelemetryGenerator:
    def __init__(self):
        self.timestamps = pd.date_range(start='2025-06-30', periods=1000, freq='S')
    
    def generate_telemetry(self, anomaly_rate=0.05):
        data = {
            'timestamp': self.timestamps,
            'voltage': np.random.normal(28, 2, 1000),
            'signal_strength': np.random.normal(100, 10, 1000),
            'apogee': np.random.normal(500, 50, 1000)
        }
        df = pd.DataFrame(data)
        anomaly_indices = np.random.choice(1000, int(1000 * anomaly_rate), replace=False)
        df.loc[anomaly_indices, 'voltage'] *= 1.5
        df.to_csv('satellite_telemetry.csv', index=False)
        return df

if __name__ == "__main__":
    generator = TelemetryGenerator()
    telemetry = generator.generate_telemetry()
    print(telemetry.head())