import sqlite3
import pandas as pd

class DBManager:
    def __init__(self, db_path='satellite_data.sqlite3'):
        self.db_path = db_path
        self.create_tables()

    def create_tables(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS telemetry (
                timestamp TEXT,
                voltage REAL,
                signal_strength REAL,
                apogee REAL,
                anomaly BOOLEAN,
                anomaly_score REAL
            )
        ''')
        conn.commit()
        conn.close()

    def insert_telemetry(self, data_path):
        conn = sqlite3.connect(self.db_path)
        df = pd.read_csv(data_path)
        df.to_sql('telemetry', conn, if_exists='append', index=False)
        conn.close()

    def query_anomalies(self):
        conn = sqlite3.connect(self.db_path)
        df = pd.read_sql_query("SELECT * FROM telemetry WHERE anomaly = 1", conn)
        conn.close()
        return df