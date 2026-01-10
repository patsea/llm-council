import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

export default function Stage1({ responses, stage1Errors }) {
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
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">{responses[activeTab].model}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{responses[activeTab].response}</ReactMarkdown>
        </div>
      </div>

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
