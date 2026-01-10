import { useState, useEffect } from 'react';
import { api } from '../api';
import './ModelConfig.css';

function ModelConfig() {
  const [availableModels, setAvailableModels] = useState({});
  const [currentConfig, setCurrentConfig] = useState({
    council_models: [],
    chairman_model: '',
  });
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [chairmanProvider, setChairmanProvider] = useState('');
  const [chairmanModel, setChairmanModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [models, config] = await Promise.all([
        api.getAvailableModels(),
        api.getModelConfig(),
      ]);

      setAvailableModels(models);
      setCurrentConfig(config);

      // Set initial chairman dropdowns
      if (config.chairman_model) {
        const [provider, ...modelParts] = config.chairman_model.split('/');
        setChairmanProvider(Object.keys(models).find(p =>
          models[p].some(m => m.id === config.chairman_model)
        ) || '');
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load model data:', error);
      let errorMessage = 'Failed to load models from OpenRouter API. Please check that:';
      errorMessage += '\n1. Your OPENROUTER_API_KEY is set in backend/.env';
      errorMessage += '\n2. The backend server is running';
      errorMessage += '\n3. You have internet connectivity';

      setMessage({ type: 'error', text: errorMessage });
      setLoading(false);
      setAvailableModels({});
    }
  };

  const handleAddCouncilMember = () => {
    if (!selectedProvider || !selectedModel) {
      setMessage({ type: 'error', text: 'Please select both provider and model' });
      return;
    }

    if (currentConfig.council_models.includes(selectedModel)) {
      setMessage({ type: 'error', text: 'This model is already in the council' });
      return;
    }

    setCurrentConfig({
      ...currentConfig,
      council_models: [...currentConfig.council_models, selectedModel],
    });

    setSelectedProvider('');
    setSelectedModel('');
    setMessage(null);
  };

  const handleRemoveCouncilMember = (modelId) => {
    setCurrentConfig({
      ...currentConfig,
      council_models: currentConfig.council_models.filter((m) => m !== modelId),
    });
  };

  const handleSetChairman = () => {
    if (!chairmanProvider || !chairmanModel) {
      setMessage({ type: 'error', text: 'Please select both provider and chairman model' });
      return;
    }

    setCurrentConfig({
      ...currentConfig,
      chairman_model: chairmanModel,
    });

    setMessage(null);
  };

  const handleSaveConfig = async () => {
    if (currentConfig.council_models.length === 0) {
      setMessage({ type: 'error', text: 'Council must have at least one member' });
      return;
    }

    if (!currentConfig.chairman_model) {
      setMessage({ type: 'error', text: 'Chairman model must be selected' });
      return;
    }

    setSaving(true);
    try {
      await api.updateModelConfig(currentConfig);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      // Try to extract error detail from response
      let errorText = 'Failed to save configuration.';
      if (error.message) {
        errorText = error.message;
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const getModelName = (modelId) => {
    for (const provider of Object.values(availableModels)) {
      const model = provider.find((m) => m.id === modelId);
      if (model) return model.name;
    }
    return modelId;
  };

  const formatContextSize = (contextLength) => {
    if (!contextLength) return '? ctx';
    if (contextLength >= 1000000) {
      return `${(contextLength / 1000000).toFixed(1)}M ctx`;
    }
    return `${Math.round(contextLength / 1000)}k ctx`;
  };

  const formatPricing = (pricing) => {
    if (!pricing) return 'Price N/A';

    // OpenRouter returns pricing per token in USD
    const inputPrice = parseFloat(pricing.prompt || 0);
    const outputPrice = parseFloat(pricing.completion || 0);

    if (inputPrice === 0 && outputPrice === 0) {
      return 'Free';
    }

    // Convert to price per 1M tokens for readability
    const inputPer1M = (inputPrice * 1000000).toFixed(2);
    const outputPer1M = (outputPrice * 1000000).toFixed(2);

    return `$${inputPer1M}/$${outputPer1M} per 1M`;
  };

  if (loading) {
    return (
      <div className="model-config">
        <div className="loading">Loading model configuration...</div>
      </div>
    );
  }

  const providers = Object.keys(availableModels);
  const availableModelsForProvider = selectedProvider
    ? availableModels[selectedProvider] || []
    : [];
  const availableModelsForChairman = chairmanProvider
    ? availableModels[chairmanProvider] || []
    : [];

  return (
    <div className="model-config">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>Model Configuration</h1>
          <p>Configure which LLM models participate in the council</p>
        </div>
        <button onClick={handleSaveConfig} disabled={saving} className="save-config-btn">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="config-section">
        <h2>Council Members</h2>
        <p className="section-description">
          Select models that will provide individual responses and rank each other
        </p>

        <div className="current-models">
          {currentConfig.council_models.length === 0 ? (
            <div className="empty-state">No council members selected</div>
          ) : (
            <div className="model-list">
              {currentConfig.council_models.map((modelId) => (
                <div key={modelId} className="model-item">
                  <span className="model-name">{getModelName(modelId)}</span>
                  <span className="model-id">{modelId}</span>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveCouncilMember(modelId)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="add-model-form">
          <div className="form-row">
            <div className="form-group">
              <label>Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedModel('');
                }}
                className="form-select"
              >
                <option value="">Select Provider</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="form-select"
                disabled={!selectedProvider}
              >
                <option value="">Select Model</option>
                {availableModelsForProvider.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} • {formatContextSize(model.context_length)} • {formatPricing(model.pricing)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddCouncilMember}
              className="btn btn-primary"
              disabled={!selectedProvider || !selectedModel}
            >
              Add to Council
            </button>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Chairman Model</h2>
        <p className="section-description">
          Select the model that will synthesize the final response based on all council input
        </p>

        {currentConfig.chairman_model && (
          <div className="current-chairman">
            <div className="model-item chairman">
              <span className="model-name">{getModelName(currentConfig.chairman_model)}</span>
              <span className="model-id">{currentConfig.chairman_model}</span>
            </div>
          </div>
        )}

        <div className="add-model-form">
          <div className="form-row">
            <div className="form-group">
              <label>Provider</label>
              <select
                value={chairmanProvider}
                onChange={(e) => {
                  setChairmanProvider(e.target.value);
                  setChairmanModel('');
                }}
                className="form-select"
              >
                <option value="">Select Provider</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                value={chairmanModel}
                onChange={(e) => setChairmanModel(e.target.value)}
                className="form-select"
                disabled={!chairmanProvider}
              >
                <option value="">Select Model</option>
                {availableModelsForChairman.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} • {formatContextSize(model.context_length)} • {formatPricing(model.pricing)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSetChairman}
              className="btn btn-primary"
              disabled={!chairmanProvider || !chairmanModel}
            >
              Set Chairman
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelConfig;
