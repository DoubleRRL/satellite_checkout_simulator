import pytest
import pandas as pd
import sqlite3
from src.db_manager import DBManager

@pytest.fixture
def telemetry_with_anomalies(tmp_path):
    csv_path = tmp_path / "telemetry_with_anomalies.csv"
    df = pd.DataFrame({
        'timestamp': pd.date_range(start='2025-06-30', periods=1000, freq='S'),
        'voltage': [28.0] * 1000,
        'signal_strength': [-90.0] * 1000,
        'apogee': [500.0] * 1000,
        'anomaly': [False] * 950 + [True] * 50,
        'anomaly_score': [-0.5] * 950 + [-0.7] * 50
    })
    df.to_csv(csv_path, index=False)
    return csv_path

@pytest.fixture
def db_manager(tmp_path, telemetry_with_anomalies):
    db_path = tmp_path / "satellite_data.sqlite3"
    db = DBManager(db_path=db_path)
    db.insert_telemetry(data_path=telemetry_with_anomalies)
    return db

def test_table_creation(db_manager):
    conn = sqlite3.connect(db_manager.db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='telemetry'")
    assert cursor.fetchone() is not None, "Telemetry table not created"
    conn.close()

def test_data_insertion(db_manager):
    conn = sqlite3.connect(db_manager.db_path)
    df = pd.read_sql_query("SELECT * FROM telemetry", conn)
    assert len(df) == 1000, "Incorrect number of rows inserted"
    assert list(df.columns) == ['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly', 'anomaly_score'], "Incorrect columns in DB"
    conn.close()

def test_anomaly_query(db_manager):
    anomalies = db_manager.query_anomalies()
    assert len(anomalies) == 50, "Incorrect number of anomalies queried"
    assert list(anomalies.columns) == ['timestamp', 'voltage', 'signal_strength', 'apogee', 'anomaly', 'anomaly_score'], "Incorrect columns in anomaly query"