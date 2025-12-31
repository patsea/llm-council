/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Get all available models grouped by provider.
   */
  async getAvailableModels() {
    const response = await fetch(`${API_BASE}/api/models/available`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to get available models from OpenRouter API');
    }
    return response.json();
  },

  /**
   * Get current model configuration.
   */
  async getModelConfig() {
    const response = await fetch(`${API_BASE}/api/models/config`);
    if (!response.ok) {
      throw new Error('Failed to get model config');
    }
    return response.json();
  },

  /**
   * Update model configuration.
   */
  async updateModelConfig(config) {
    const response = await fetch(`${API_BASE}/api/models/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to update model configuration');
    }
    return response.json();
  },

  /**
   * Get export URL for a conversation.
   */
  getExportUrl(conversationId, format) {
    return `${API_BASE}/api/conversations/${conversationId}/export/${format}`;
  },

  /**
   * Get analytics metrics.
   */
  async getAnalyticsMetrics() {
    const response = await fetch(`${API_BASE}/api/analytics/metrics`);
    if (!response.ok) {
      throw new Error('Failed to get analytics metrics');
    }
    return response.json();
  },

  /**
   * Get system health including model validation status.
   */
  async getSystemHealth() {
    const response = await fetch(`${API_BASE}/api/system/health`);
    if (!response.ok) {
      throw new Error('Failed to get system health');
    }
    return response.json();
  },

  /**
   * Search conversations.
   */
  async searchConversations(query) {
    const response = await fetch(`${API_BASE}/api/conversations/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error('Failed to search conversations');
    }
    return response.json();
  },

  /**
   * Retry Stage 3 synthesis for a conversation that failed.
   */
  async retryStage3(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/retry-stage3`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      throw new Error('Failed to retry Stage 3');
    }
    return response.json();
  },
};
