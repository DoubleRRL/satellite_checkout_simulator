import pytest
import pandas as pd
import numpy as np
from src.telemetry_generator import TelemetryGenerator

@pytest.fixture
def generator():
    return TelemetryGenerator()

def test_row_count(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    assert len(df) == 1000, "Expected 1000 rows in telemetry data"

def test_column_names(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    expected_columns = ['timestamp', 'voltage', 'signal_strength', 'apogee']
    assert list(df.columns) == expected_columns, "Incorrect column names"

def test_anomaly_rate(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    voltage_threshold = np.percentile(df['voltage'], 95)  # Rough estimate for anomalies
    anomaly_count = len(df[df['voltage'] > voltage_threshold])
    assert 40 <= anomaly_count <= 60, f"Expected ~50 anomalies, got {anomaly_count}"

def test_voltage_range(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    assert df['voltage'].mean() >= 26 and df['voltage'].mean() <= 30, "Voltage mean out of expected range"
    assert df['voltage'].std() >= 1.5 and df['voltage'].std() <= 4, "Voltage std dev out of expected range"

def test_signal_strength_range(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    assert df['signal_strength'].mean() >= 90 and df['signal_strength'].mean() <= 110, "Signal strength mean out of range"

def test_apogee_range(generator):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    assert df['apogee'].mean() >= 450 and df['apogee'].mean() <= 550, "Apogee mean out of range"

def test_csv_output(generator, tmp_path):
    df = generator.generate_telemetry(anomaly_rate=0.05)
    csv_path = tmp_path / "satellite_telemetry.csv"
    df.to_csv(csv_path, index=False)
    saved_df = pd.read_csv(csv_path)
    assert len(saved_df) == 1000, "CSV row count mismatch"
    assert list(saved_df.columns) == ['timestamp', 'voltage', 'signal_strength', 'apogee'], "CSV column mismatch"