import pytest
import pandas as pd
from src.anomaly_detector import AnomalyDetector

@pytest.fixture
def detector(tmp_path):
    data_path = tmp_path / "satellite_telemetry.csv"
    output_path = tmp_path / "telemetry_with_anomalies.csv"
    df = pd.DataFrame({
        'timestamp': pd.date_range(start='2025-06-30', periods=1000, freq='S'),
        'voltage': [28.0] * 1000,
        'signal_strength': [-90.0] * 1000,
        'apogee': [500.0] * 1000
    })
    df.iloc[::20, 1] = 45.0  # Simulate anomalies
    df.to_csv(data_path, index=False)
    return AnomalyDetector(data_path=data_path, output_path=output_path)

def test_anomaly_count(detector):
    anomalies = detector.detect_anomalies()
    assert len(anomalies) > 0, "No anomalies detected"

def test_anomaly_columns(detector):
    anomalies = detector.detect_anomalies()
    expected_columns = ['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly', 'anomaly_score']
    assert list(anomalies.columns) == expected_columns, "Incorrect columns in anomalies"

def test_csv_output(detector, tmp_path):
    detector.detect_anomalies()
    csv_path = tmp_path / "telemetry_with_anomalies.csv"
    saved_df = pd.read_csv(csv_path)
    assert len(saved_df) == 1000, "CSV row count mismatch"
    assert list(saved_df.columns) == ['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly', 'anomaly_score'], "CSV column mismatch"

def test_anomaly_voltage(detector):
    anomalies = detector.detect_anomalies()
    assert anomalies['voltage'].mean() > 30, "Anomaly voltages should be higher than normal"