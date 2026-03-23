import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import NavBar from './components/NavBar';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ModelConfig from './components/ModelConfig';
import Analytics from './components/Analytics';
import { api } from './api';
import './App.css';

function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Check for conversation ID in URL params
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setCurrentConversationId(conversationId);
    }
  }, [searchParams]);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await api.searchConversations(searchQuery);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (conversationId) => {
    setCurrentConversationId(conversationId);
    setSearchResults([]);
    setSearchQuery('');
  };

  const getMatchLocationLabel = (location) => {
    const labels = {
      title: 'Title',
      user_message: 'User Message',
      assistant_response: 'Assistant Response',
    };
    return labels[location] || location;
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data.responses;
              lastMsg.metadata = { ...lastMsg.metadata, stage1_errors: event.data.errors };
              lastMsg.loading.stage1 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = { ...lastMsg.metadata, ...event.metadata };
              lastMsg.loading.stage2 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Instead of removing messages, show error in the assistant message
      setCurrentConversation((prev) => {
        const messages = [...prev.messages];
        const lastMsg = messages[messages.length - 1];
        lastMsg.stage1 = null;
        lastMsg.stage2 = null;
        lastMsg.stage3 = {
          model: 'error',
          response: `❌ Error: ${error.message}\n\nThis typically happens when:\n- Your prompt is too long or complex\n- The request timed out (current limit: 15 minutes)\n- Network connectivity issues\n\nTry:\n- Shortening your prompt\n- Reducing the number of council models\n- Breaking your task into smaller parts`,
        };
        lastMsg.loading = { stage1: false, stage2: false, stage3: false };
        return { ...prev, messages };
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <div className="chat-main">
        <div className="search-conversations" style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search conversations by title or content..."
              style={{
                flex: 1,
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '0.5rem 0.75rem',
                color: '#fff',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                opacity: isSearching ? 0.6 : 1
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: '0.5rem', background: '#1a1a1a', borderRadius: '4px', padding: '0.5rem' }}>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSearchResultClick(result.id)}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    marginBottom: '0.25rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{result.title}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {result.message_count} messages • {getMatchLocationLabel(result.match_location)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <ChatInterface
          conversation={currentConversation}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function App() {
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.getSystemHealth();
        setSystemHealth(health);
      } catch (error) {
        console.error('Failed to check system health:', error);
      }
    };
    checkHealth();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Red error banner at top if model validation failed */}
        {systemHealth && !systemHealth.model_validation?.valid && (
          <div style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '12px 20px',
            fontWeight: 'bold',
            textAlign: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 9999
          }}>
            ⚠️ Model Configuration Error: Some configured models are not available in OpenRouter.
            {systemHealth.model_validation?.errors?.map((error, i) => (
              <div key={i} style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>
                {error}
              </div>
            ))}
          </div>
        )}
        <NavBar />
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/config" element={<div className="page-wrapper"><ModelConfig /></div>} />
          <Route path="/analytics" element={<div className="page-wrapper"><Analytics /></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
