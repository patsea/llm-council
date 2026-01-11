import { useState, useEffect } from 'react';
import { api } from '../api';
import './Analytics.css';

function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [costData, setCostData] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [valueData, setValueData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadCostData();
    loadPerfData();
    fetch('http://localhost:8001/api/analytics/value-score')
      .then(res => res.json())
      .then(data => setValueData(data))
      .catch(err => console.error('Value score error:', err));
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await api.getAnalyticsMetrics();
      setMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setLoading(false);
    }
  };

  const loadCostData = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/analytics/costs');
      const data = await response.json();
      setCostData(data);
    } catch (error) {
      console.error('Cost analytics error:', error);
    }
  };

  const loadPerfData = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/analytics/performance');
      const data = await response.json();
      setPerfData(data);
    } catch (error) {
      console.error('Performance analytics error:', error);
    }
  };

  if (loading) {
    return (
      <div className="analytics">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <p>Model performance metrics</p>
      </div>

      {valueData && valueData.models.length > 0 && (
        <div className="analytics-section value-section">
          <h2>🏆 Model Value Rankings</h2>
          <p className="section-subtitle">
            Composite score: Quality (40%) + Speed (30%) + Cost Efficiency (30%)
          </p>

          <div className="value-podium">
            {valueData.models.slice(0, 3).map((item, i) => (
              <div key={i} className={`podium-item rank-${i + 1}`}>
                <div className="podium-rank">#{i + 1}</div>
                <div className="podium-model">{item.model.split('/')[1] || item.model}</div>
                <div className="podium-score">{item.value_score}</div>
                <div className="podium-breakdown">
                  <span title="Quality">🎯 {item.quality_score}</span>
                  <span title="Speed">⚡ {item.speed_score}</span>
                  <span title="Efficiency">💰 {item.efficiency_score}</span>
                </div>
              </div>
            ))}
          </div>

          <table className="analytics-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Value Score</th>
                <th>Quality</th>
                <th>Speed</th>
                <th>Efficiency</th>
                <th>Avg Rank</th>
                <th>Avg Time</th>
                <th>$/Token</th>
              </tr>
            </thead>
            <tbody>
              {valueData.models.map((item, i) => (
                <tr key={i} className={i < 3 ? 'top-model' : ''}>
                  <td>#{i + 1}</td>
                  <td>{item.model.split('/')[1] || item.model}</td>
                  <td><strong>{item.value_score}</strong></td>
                  <td>{item.quality_score}</td>
                  <td>{item.speed_score}</td>
                  <td>{item.efficiency_score}</td>
                  <td>{item.avg_rank}</td>
                  <td>{item.avg_time}s</td>
                  <td>{item.tokens_per_dollar.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {costData && (
        <div className="analytics-section">
          <h2>💰 Cost Analytics</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">${costData.total_cost.toFixed(4)}</div>
              <div className="stat-label">Total Spend</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${(costData.total_cost / costData.conversation_count).toFixed(4)}</div>
              <div className="stat-label">Avg per Conversation</div>
            </div>
          </div>

          <h3>Cost by Model</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Total Cost</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {costData.cost_by_model.map((item, i) => (
                <tr key={i}>
                  <td>{item.model}</td>
                  <td>${item.cost.toFixed(4)}</td>
                  <td>{((item.cost / costData.total_cost) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Cost by Stage</h3>
          <div className="stage-costs">
            <div className="stage-cost stage1">
              <span>Stage 1 (Response)</span>
              <span>${costData.cost_by_stage.stage1.toFixed(4)}</span>
            </div>
            <div className="stage-cost stage2">
              <span>Stage 2 (Ranking)</span>
              <span>${costData.cost_by_stage.stage2.toFixed(4)}</span>
            </div>
            <div className="stage-cost stage3">
              <span>Stage 3 (Chairman)</span>
              <span>${costData.cost_by_stage.stage3.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}

      {perfData && (
        <>
          <div className="analytics-section">
            <h2>📊 Token Analytics</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{perfData.total_tokens.toLocaleString()}</div>
                <div className="stat-label">Total Tokens</div>
              </div>
            </div>

            <h3>Tokens by Model</h3>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Ratio (In/Out)</th>
                </tr>
              </thead>
              <tbody>
                {perfData.tokens_by_model.map((item, i) => (
                  <tr key={i}>
                    <td>{item.model.split('/')[1] || item.model}</td>
                    <td>{item.prompt.toLocaleString()}</td>
                    <td>{item.completion.toLocaleString()}</td>
                    <td>{item.total.toLocaleString()}</td>
                    <td>{item.completion > 0 ? (item.prompt / item.completion).toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="analytics-section">
            <h2>⚡ Response Times</h2>

            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Model</th>
                  <th>Avg Time</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Samples</th>
                </tr>
              </thead>
              <tbody>
                {perfData.response_times.map((item, i) => (
                  <tr key={i}>
                    <td>#{i + 1}</td>
                    <td>{item.model.split('/')[1] || item.model}</td>
                    <td>{item.avg_time}s</td>
                    <td>{item.min_time}s</td>
                    <td>{item.max_time}s</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {perfData.total_errors > 0 && (
            <div className="analytics-section">
              <h2>⚠️ Errors ({perfData.total_errors})</h2>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Error Count</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.errors_by_model.map((item, i) => (
                    <tr key={i}>
                      <td>{item.model}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="analytics-section">
        <h2>Model Performance Metrics</h2>

        {metrics && metrics.model_metrics && metrics.model_metrics.length > 0 ? (
          <>
            <div className="metrics-summary">
              <div className="summary-card">
                <div className="summary-value">{metrics.total_conversations}</div>
                <div className="summary-label">Total Conversations</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{metrics.model_metrics.length}</div>
                <div className="summary-label">Models Evaluated</div>
              </div>
            </div>

            <div className="metrics-table-container">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Model</th>
                    <th>Avg. Ranking</th>
                    <th>Response Count</th>
                    <th>Times Ranked</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.model_metrics.map((metric, index) => (
                    <tr key={metric.model}>
                      <td className="rank-cell">
                        <span className={`rank-badge rank-${Math.min(index + 1, 3)}`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="model-cell">
                        <div className="model-name">{metric.model}</div>
                      </td>
                      <td className="metric-cell">
                        <span className="metric-value">
                          {metric.average_rank > 0 ? metric.average_rank.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="metric-cell">
                        {metric.response_count}
                      </td>
                      <td className="metric-cell">
                        {metric.rank_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="metrics-info">
              <p>
                <strong>Average Ranking:</strong> Lower is better. Shows how models rank on
                average when peers evaluate their responses.
              </p>
              <p>
                <strong>Response Count:</strong> Number of times the model has provided a response.
              </p>
              <p>
                <strong>Times Ranked:</strong> Number of times the model has been ranked by peers.
              </p>
            </div>
          </>
        ) : (
          <div className="empty-state">
            No metrics available yet. Start some conversations to see model performance data.
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
