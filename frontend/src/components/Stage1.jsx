import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

export default function Stage1({ responses, stage1Errors, metadata }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="tabs">
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {resp.model.split('/')[1] || resp.model}
            {resp.cost > 0 && (
              <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                ${resp.cost.toFixed(4)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">{responses[activeTab].model}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{responses[activeTab].response}</ReactMarkdown>
        </div>
      </div>

      {/* Cost Summary */}
      {metadata?.stage1_cost > 0 && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '12px 16px',
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#166534', fontWeight: '500' }}>💰 Stage 1 Total Cost</span>
          <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '16px' }}>
            ${metadata.stage1_cost.toFixed(4)}
          </span>
        </div>
      )}

      {/* Failed Models Warning - shown after Stage 3 for visibility */}
      {stage1Errors && stage1Errors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '8px' }}>
            ⚠️ {stage1Errors.length} model(s) failed to respond:
          </div>
          {stage1Errors.map((err, i) => (
            <div key={i} style={{ color: '#b91c1c', fontSize: '14px', marginTop: '4px' }}>
              • <strong>{err.model}</strong>: {err.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
