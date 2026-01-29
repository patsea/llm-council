import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API Module', () => {
  it('should have listConversations method', () => {
    expect(api.listConversations).toBeDefined()
    expect(typeof api.listConversations).toBe('function')
  })

  it('should call correct endpoint for listConversations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', title: 'Test' }])
    })

    await api.listConversations()

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations')
  })

  it('should create conversation with POST request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '123', created_at: new Date().toISOString() })
    })

    await api.createConversation()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/conversations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('should send message with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'success' })
    })

    await api.sendMessage('conv-123', 'What is AI?')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/conversations/conv-123/message',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'What is AI?' })
      })
    )
  })

  it('should throw error on failed requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(api.listConversations()).rejects.toThrow('Failed to list conversations')
  })

  it('should have getModelConfig method', () => {
    expect(api.getModelConfig).toBeDefined()
  })

  it('should have updateModelConfig method', () => {
    expect(api.updateModelConfig).toBeDefined()
  })

  it('should construct export URL correctly', () => {
    const url = api.getExportUrl('conv-123', 'markdown')
    expect(url).toBe('http://localhost:8001/api/conversations/conv-123/export/markdown')
  })

  it('should have searchConversations method', () => {
    expect(api.searchConversations).toBeDefined()
  })

  it('should send search query correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    })

    await api.searchConversations('AI safety')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/conversations/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'AI safety' })
      })
    )
  })

  it('should have retryStage3 method', () => {
    expect(api.retryStage3).toBeDefined()
  })

  it('should call retryStage3 endpoint correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'success' })
    })

    await api.retryStage3('conv-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/conversations/conv-123/retry-stage3',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('should have getAnalyticsMetrics method', () => {
    expect(api.getAnalyticsMetrics).toBeDefined()
  })

  it('should have getSystemHealth method', () => {
    expect(api.getSystemHealth).toBeDefined()
  })
})
