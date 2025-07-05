import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

function App() {
  const [data, setData] = useState({ points: [], stats: {} });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);
  const [currentAnomalyIndex, setCurrentAnomalyIndex] = useState(0);

  // Fetch real data from the API
  useEffect(() => {
    const fetchTelemetryData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5001/telemetry');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const apiData = await response.json();
        console.log('Raw API data:', apiData);
        const anomalies = apiData.anomalies || [];
        const normal = apiData.normal || [];
        const processedData = [
          ...anomalies.map(point => ({
            timestamp: point.timestamp,
            voltage: point.voltage,
            signal_strength: point.signal_strength,
            apogee: point.apogee,
            anomaly_score: point.anomaly_score,
            x: new Date(point.timestamp).getTime(),
            type: 'anomaly',
            status: 'Anomaly Detected'
          })),
          ...normal.map(point => ({
            timestamp: point.timestamp,
            voltage: point.voltage,
            signal_strength: point.signal_strength,
            apogee: point.apogee,
            anomaly_score: point.anomaly_score,
            x: new Date(point.timestamp).getTime(),
            type: 'normal',
            status: 'Normal Reading'
          }))
        ];
        setData({ points: processedData, stats: apiData.stats || {} });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
        setError(`Failed to load telemetry data: ${error.message}`);
        setLoading(false);
      }
    };
    fetchTelemetryData();
  }, []);

  const handlePointClick = (elements, chart, metricKey, title) => {
    if (elements.length === 0) return;
    
    const pointIndex = elements[0].index;
    const point = data.points[pointIndex];
    
    if (!point) return;
    
    const value = point[metricKey];
    const mean = data.points.reduce((sum, p) => sum + p[metricKey], 0) / data.points.length || (data.stats[`${metricKey}_mean`] || 0);
    const std = Math.sqrt(data.points.reduce((sum, p) => sum + Math.pow(p[metricKey] - mean, 2), 0) / data.points.length) || (data.stats[`${metricKey}_std`] || 0);
    const zScore = std !== 0 ? ((value - mean) / std) : 0;
    const percentile = data.points.length ? (data.points.filter(p => p[metricKey] <= value).length / data.points.length) * 100 : 0;

    const insights = [];
    if (Math.abs(zScore) > 2) insights.push(`🚨 ${value.toFixed(2)}${title === 'Apogee (km)' ? 'km' : title === 'Signal Strength (dBm)' ? 'dBm' : 'V'} is ${Math.abs(zScore).toFixed(1)}σ from mean - significant!`);
    else if (Math.abs(zScore) > 1) insights.push(`⚠️ ${value.toFixed(2)}${title === 'Apogee (km)' ? 'km' : title === 'Signal Strength (dBm)' ? 'dBm' : 'V'} is ${Math.abs(zScore).toFixed(1)}σ off - mild deviation.`);
    else insights.push(`✅ ${value.toFixed(2)}${title === 'Apogee (km)' ? 'km' : title === 'Signal Strength (dBm)' ? 'dBm' : 'V'} is normal (${zScore.toFixed(1)}σ).`);
    
    if (percentile > 95) insights.push(`📊 Top 5% - high!`);
    else if (percentile < 5) insights.push(`📊 Bottom 5% - low!`);
    
    if (title === 'Voltage (V)') {
      if (value < 20) insights.push(`🔋 Low voltage - power issues?`);
      else if (value > 30) insights.push(`⚡ High voltage - check charger!`);
    } else if (title === 'Signal Strength (dBm)') {
      if (value < 80) insights.push(`📡 Weak signal - communication risk.`);
      else if (value > 120) insights.push(`📡 Strong signal - optimal.`);
    } else if (title === 'Apogee (km)') {
      if (value < 400) insights.push(`🛰️ Low apogee - orbital decay?`);
      else if (value > 600) insights.push(`🛰️ High apogee - extended orbit.`);
    }

    setSelectedPoint({
      timestamp: point.timestamp,
      value,
      metric: title,
      anomaly: point.type === 'anomaly',
      anomaly_score: point.anomaly_score,
      zScore,
      percentile,
      insights
    });
  };

  const handleAnomalyRibbonClick = () => {
    const anomalies = data.points.filter(p => p.type === 'anomaly');
    if (anomalies.length > 0) {
      setCurrentAnomalyIndex(0);
      setShowAnomalyDetails(true);
    }
  };

  const handlePrevAnomaly = () => {
    setCurrentAnomalyIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNextAnomaly = () => {
    const anomalies = data.points.filter(p => p.type === 'anomaly');
    setCurrentAnomalyIndex(prev => Math.min(prev + 1, anomalies.length - 1));
  };

  const getCurrentAnomalyAnalysis = () => {
    const anomalies = data.points.filter(p => p.type === 'anomaly');
    if (anomalies.length === 0 || currentAnomalyIndex < 0 || currentAnomalyIndex >= anomalies.length) return null;

    const anomaly = anomalies[currentAnomalyIndex];
    const voltage = { value: anomaly.voltage, zScore: 0, percentile: 0, insights: [] };
    const signal_strength = { value: anomaly.signal_strength, zScore: 0, percentile: 0, insights: [] };
    const apogee = { value: anomaly.apogee, zScore: 0, percentile: 0, insights: [] };

    const mean = data.points.reduce((sum, p) => sum + p.voltage, 0) / data.points.length || (data.stats.voltage_mean || 0);
    const std = Math.sqrt(data.points.reduce((sum, p) => sum + Math.pow(p.voltage - mean, 2), 0) / data.points.length) || (data.stats.voltage_std || 0);
    voltage.zScore = std !== 0 ? ((voltage.value - mean) / std) : 0;
    voltage.percentile = data.points.length ? (data.points.filter(p => p.voltage <= voltage.value).length / data.points.length) * 100 : 0;
    if (Math.abs(voltage.zScore) > 2) voltage.insights.push(`🚨 ${voltage.value.toFixed(2)}V is ${Math.abs(voltage.zScore).toFixed(1)}σ - significant!`);
    else if (Math.abs(voltage.zScore) > 1) voltage.insights.push(`⚠️ ${voltage.value.toFixed(2)}V is ${Math.abs(voltage.zScore).toFixed(1)}σ - deviation.`);
    else voltage.insights.push(`✅ ${voltage.value.toFixed(2)}V is normal (${voltage.zScore.toFixed(1)}σ).`);
    if (voltage.value < 20) voltage.insights.push(`🔋 Low voltage - power issues?`);
    else if (voltage.value > 30) voltage.insights.push(`⚡ High voltage - check charger!`);

    return { anomaly, voltage, signal_strength, apogee };
  };

  const ChartComponent = ({ metricKey, title }) => {
    const normalPoints = data.points.filter(p => p.type === 'normal');
    const anomalyPoints = data.points.filter(p => p.type === 'anomaly');

    const chartData = {
      datasets: [
        {
          label: 'Normal',
          data: normalPoints.map(point => ({
            x: point.x,
            y: point[metricKey]
          })),
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Anomalies',
          data: anomalyPoints.map(point => ({
            x: point.x,
            y: point[metricKey]
          })),
          backgroundColor: '#EF4444',
          borderColor: '#EF4444',
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: title.toUpperCase(),
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              return new Date(context[0].parsed.x).toLocaleString();
            },
            label: function(context) {
              const point = data.points.find(p => p.x === context.parsed.x && p[metricKey] === context.parsed.y);
              return [
                `${title}: ${context.parsed.y.toFixed(2)}`,
                `Status: ${point?.status || 'Unknown'}`,
                `Anomaly Score: ${point?.anomaly_score?.toFixed(3) || 'N/A'}`,
                'Click for detailed analysis'
              ];
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm'
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: title
          }
        }
      },
      onClick: (event, elements) => handlePointClick(elements, event.chart, metricKey, title)
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full" style={{ marginLeft: '20px' }}>
        <div style={{ height: '300px' }}>
          <Scatter data={chartData} options={options} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl text-gray-700">Loading telemetry data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8" style={{ paddingLeft: '40px' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8" style={{ marginLeft: '20px' }}>
          <h1 className="text-3xl font-bold text-gray-800">
            🛰️{' '}
            <span className="text-blue-600">S</span>
            <span className="text-red-600">A</span>
            <span className="text-green-600">T</span>
            <span className="text-yellow-600">E</span>
            <span className="text-orange-600">L</span>
            <span className="text-purple-600">L</span>
            <span className="text-pink-600">I</span>
            <span className="text-black">TE TELEMETRY DASHBOARD</span>
          </h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center" style={{ marginLeft: '20px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{ marginLeft: '20px' }}>
          <div className="bg-white p-6 rounded-lg shadow-md text-center border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Readings</h3>
            <p className="text-2xl font-bold text-blue-600">{data.points.length}</p>
            <p className="text-sm text-gray-500">All telemetry data</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Normal Points</h3>
            <p className="text-2xl font-bold text-green-600">{data.points.filter(d => d.type === 'normal').length}</p>
            <p className="text-sm text-gray-500">Healthy readings</p>
          </div>
          <div 
            className="bg-white p-6 rounded-lg shadow-md text-center border-l-4 border-red-500 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleAnomalyRibbonClick}
          >
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Anomalies Detected</h3>
            <p className="text-2xl font-bold text-red-600">{data.points.filter(d => d.type === 'anomaly').length}</p>
            <p className="text-sm text-gray-500">Click to view details</p>
          </div>
        </div>
        
        {showAnomalyDetails && (() => {
          const analysis = getCurrentAnomalyAnalysis();
          if (!analysis) return null;
          
          return (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6" style={{ marginLeft: '20px' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">🚨 Anomaly Analysis</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {currentAnomalyIndex + 1} of {data.points.filter(p => p.type === 'anomaly').length}
                  </span>
                  <button 
                    onClick={handlePrevAnomaly}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                    disabled={data.points.filter(p => p.type === 'anomaly').length <= 1}
                  >
                    ← Prev
                  </button>
                  <button 
                    onClick={handleNextAnomaly}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                    disabled={data.points.filter(p => p.type === 'anomaly').length <= 1}
                  >
                    Next →
                  </button>
                  <button 
                    onClick={() => setShowAnomalyDetails(false)} 
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg mb-4 text-center">
                <p className="text-sm text-red-600">Anomaly Detected</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(analysis.anomaly.timestamp).toLocaleString()}
                </p>
                <div className="inline-block px-2 py-1 rounded text-xs font-semibold mt-2 bg-red-100 text-red-800">
                  Score: {analysis.anomaly.anomaly_score.toFixed(4)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">⚡ Voltage</h4>
                  <p className="text-lg font-bold text-blue-600">{analysis.voltage.value.toFixed(2)}V</p>
                  <p className="text-sm text-blue-700">Z-Score: {analysis.voltage.zScore.toFixed(2)}σ</p>
                  <p className="text-sm text-blue-700">Percentile: {analysis.voltage.percentile.toFixed(1)}%</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">📡 Signal Strength</h4>
                  <p className="text-lg font-bold text-green-600">{analysis.signal_strength.value.toFixed(2)}dBm</p>
                  <p className="text-sm text-green-700">Z-Score: {analysis.signal_strength.zScore.toFixed(2)}σ</p>
                  <p className="text-sm text-green-700">Percentile: {analysis.signal_strength.percentile.toFixed(1)}%</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🛰️ Apogee</h4>
                  <p className="text-lg font-bold text-purple-600">{analysis.apogee.value.toFixed(2)}km</p>
                  <p className="text-sm text-purple-700">Z-Score: {analysis.apogee.zScore.toFixed(2)}σ</p>
                  <p className="text-sm text-purple-700">Percentile: {analysis.apogee.percentile.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">🔍 Voltage Insights</h4>
                  <div className="space-y-1">
                    {analysis.voltage.insights.map((insight, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-sm">{insight}</div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">🔍 Signal Strength Insights</h4>
                  <div className="space-y-1">
                    {analysis.signal_strength.insights.map((insight, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-sm">{insight}</div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">🔍 Apogee Insights</h4>
                  <div className="space-y-1">
                    {analysis.apogee.insights.map((insight, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-sm">{insight}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        
        <div className="space-y-6" style={{ marginLeft: '20px' }}>
          <ChartComponent metricKey="voltage" title="Voltage (V)" />
          <ChartComponent metricKey="signal_strength" title="Signal Strength (dBm)" />
          <ChartComponent metricKey="apogee" title="Apogee (km)" />
        </div>
        
        {selectedPoint && (
          <div className="bg-white p-6 rounded-lg shadow-md mt-6" style={{ marginLeft: '20px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">🤖 AI Analysis</h3>
              <button 
                onClick={() => setSelectedPoint(null)} 
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Selected Point</p>
                <p className="font-semibold text-lg">
                  {selectedPoint.value.toFixed(2)}
                  {selectedPoint.metric === 'Apogee (km)' ? 'km' : selectedPoint.metric === 'Signal Strength (dBm)' ? 'dBm' : 'V'}
                </p>
                <p className="text-xs text-gray-500">{new Date(selectedPoint.timestamp).toLocaleString()}</p>
                <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${
                  selectedPoint.anomaly ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {selectedPoint.anomaly ? '🚨 Anomaly' : '✅ Normal'}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-600">Z-Score</p>
                  <p className="font-bold text-blue-800 text-lg">{selectedPoint.zScore.toFixed(2)}σ</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">Percentile</p>
                  <p className="font-bold text-green-800 text-lg">{selectedPoint.percentile.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-sm text-yellow-600">Anomaly Score</p>
                <p className="font-bold text-yellow-800 text-lg">{selectedPoint.anomaly_score.toFixed(4)}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${selectedPoint.anomaly_score > 0.5 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${selectedPoint.anomaly_score * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-center">🔍 Insights</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedPoint.insights.map((insight, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">{insight}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;