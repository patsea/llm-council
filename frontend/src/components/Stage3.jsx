import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import './Stage3.css';

export default function Stage3({ finalResponse, conversationId, onRetrySuccess }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);

  if (!finalResponse) {
    return null;
  }

  const hasError = finalResponse.error || finalResponse.response?.startsWith('Error:');

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      const result = await api.retryStage3(conversationId);
      if (result.status === 'success') {
        if (onRetrySuccess) {
          onRetrySuccess(result.stage3);
        }
      } else {
        setRetryError(result.stage3?.error_message || 'Retry failed');
      }
    } catch (err) {
      setRetryError(err.message || 'Failed to retry');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="stage stage3">
      <h3 className="stage-title">Stage 3: Final Council Answer</h3>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
          {finalResponse.used_fallback && (
            <span className="fallback-indicator"> (fallback model used)</span>
          )}
        </div>

        {hasError ? (
          <div className="error-container">
            <div className="error-message">
              <p>{finalResponse.response || finalResponse.error_message}</p>
              {finalResponse.error_type && (
                <p className="error-type">Error type: {finalResponse.error_type}</p>
              )}
            </div>

            {conversationId && (
              <>
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="retry-button"
                >
                  {isRetrying ? (
                    <>
                      <span className="retry-spinner">⟳</span>
                      Retrying...
                    </>
                  ) : (
                    <>
                      ↻ Retry Synthesis
                    </>
                  )}
                </button>

                {retryError && (
                  <p className="retry-error">{retryError}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="final-text markdown-content">
            <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
