import { useState, useEffect } from 'react';
import { api } from '../api';
import './Analytics.css';

function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
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
