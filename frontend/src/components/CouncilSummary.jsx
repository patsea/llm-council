import React from 'react';
import './CouncilSummary.css';

export default function CouncilSummary({ stage1, stage2, stage3, metadata }) {
  if (!stage1 || stage1.length === 0) return null;

  const aggregateRankings = metadata?.aggregate_rankings || [];

  // Build ranking lookup: model -> {position, score}
  // aggregateRankings items have 'model' field with full model path
  const rankingLookup = {};
  aggregateRankings.forEach((item, idx) => {
    // Use full model path directly
    if (item.model) {
      rankingLookup[item.model] = {
        position: idx + 1,
        score: item.average_rank?.toFixed(1) || '-'
      };
    }
  });

  // Helper to get ranking by model path
  const formatRank = (model) => {
    const r = rankingLookup[model];
    if (!r) return '-';
    const suffix = r.position === 1 ? 'st' : r.position === 2 ? 'nd' : r.position === 3 ? 'rd' : 'th';
    return `${r.position}${suffix} (${r.score})`;
  };

  // Calculate totals
  const stage1Cost = stage1.reduce((sum, r) => sum + (r.cost || 0), 0);
  const stage2Cost = stage2?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
  const stage3Cost = stage3?.cost || 0;
  const totalCost = stage1Cost + stage2Cost + stage3Cost;

  const stage1Tokens = stage1.reduce((sum, r) => sum + (r.tokens_prompt || 0) + (r.tokens_completion || 0), 0);
  const stage2Tokens = stage2?.reduce((sum, r) => sum + (r.tokens_prompt || 0) + (r.tokens_completion || 0), 0) || 0;
  const stage3Tokens = (stage3?.tokens_prompt || 0) + (stage3?.tokens_completion || 0);
  const totalTokens = stage1Tokens + stage2Tokens + stage3Tokens;

  const errorCount = metadata?.stage1_errors?.length || 0;

  const formatModel = (model) => model?.split('/')[1] || model || '-';
  const formatCost = (cost) => cost > 0 ? `$${cost.toFixed(4)}` : '-';
  const formatTokens = (prompt, completion) => {
    if (!prompt && !completion) return '-';
    return `${prompt || 0}/${completion || 0}`;
  };
  const formatTime = (time) => time ? `${time}s` : '-';

  return (
    <div className="council-summary">
      <h3>📊 Council Summary</h3>

      <div className="summary-stats">
        <div className="stat">
          <span className="stat-label">Total Cost</span>
          <span className="stat-value cost">${totalCost.toFixed(4)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Tokens</span>
          <span className="stat-value">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">API Calls</span>
          <span className="stat-value">{stage1.length + (stage2?.length || 0) + (stage3 ? 1 : 0)}</span>
        </div>
        {errorCount > 0 && (
          <div className="stat error">
            <span className="stat-label">Errors</span>
            <span className="stat-value">{errorCount}</span>
          </div>
        )}
      </div>

      <table className="summary-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Model</th>
            <th>Cost</th>
            <th>Tokens (In/Out)</th>
            <th>Time</th>
            <th>Peer Rank</th>
          </tr>
        </thead>
        <tbody>
          {/* Stage 1 rows */}
          {stage1.map((r, i) => (
            <tr key={`s1-${i}`} className="stage1-row">
              <td>{i === 0 ? '1 - Response' : ''}</td>
              <td>{formatModel(r.model)}</td>
              <td>{formatCost(r.cost)}</td>
              <td>{formatTokens(r.tokens_prompt, r.tokens_completion)}</td>
              <td>{formatTime(r.response_time)}</td>
              <td>{formatRank(r.model)}</td>
            </tr>
          ))}

          {/* Stage 2 rows */}
          {stage2?.map((r, i) => (
            <tr key={`s2-${i}`} className="stage2-row">
              <td>{i === 0 ? '2 - Ranking' : ''}</td>
              <td>{formatModel(r.model)}</td>
              <td>{formatCost(r.cost)}</td>
              <td>{formatTokens(r.tokens_prompt, r.tokens_completion)}</td>
              <td>{formatTime(r.response_time)}</td>
              <td>-</td>
            </tr>
          ))}

          {/* Stage 3 row */}
          {stage3 && (
            <tr className="stage3-row">
              <td>3 - Chairman</td>
              <td>{formatModel(stage3.model)}</td>
              <td>{formatCost(stage3.cost)}</td>
              <td>{formatTokens(stage3.tokens_prompt, stage3.tokens_completion)}</td>
              <td>{formatTime(stage3.response_time)}</td>
              <td>-</td>
            </tr>
          )}

          {/* Totals row */}
          <tr className="totals-row">
            <td><strong>TOTAL</strong></td>
            <td>{stage1.length + (stage2?.length || 0) + 1} calls</td>
            <td><strong>${totalCost.toFixed(4)}</strong></td>
            <td><strong>{totalTokens.toLocaleString()}</strong></td>
            <td>-</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
