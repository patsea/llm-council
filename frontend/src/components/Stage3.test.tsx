import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Stage3 from './Stage3'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    retryStage3: vi.fn()
  }
}))

describe('Stage3 Component - Final Synthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockFinalResponse = {
    model: 'anthropic/claude-sonnet',
    response: 'This is the final synthesized answer from the council.',
    used_fallback: false
  }

  it('should render Stage 3 title', () => {
    render(<Stage3 finalResponse={mockFinalResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument()
  })

  it('should display chairman model name', () => {
    render(<Stage3 finalResponse={mockFinalResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText(/Chairman:/i)).toBeInTheDocument()
    expect(screen.getByText(/claude-sonnet/i)).toBeInTheDocument()
  })

  it('should display final response content', () => {
    render(<Stage3 finalResponse={mockFinalResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText(/final synthesized answer/i)).toBeInTheDocument()
  })

  it('should show fallback indicator when fallback used', () => {
    const fallbackResponse = { ...mockFinalResponse, used_fallback: true }
    render(<Stage3 finalResponse={fallbackResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText(/fallback model used/i)).toBeInTheDocument()
  })

  it('should display error message when response has error', () => {
    const errorResponse = {
      model: 'anthropic/claude-sonnet',
      response: 'Error: Rate limit exceeded',
      error_type: 'RateLimitError'
    }
    render(<Stage3 finalResponse={errorResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument()
    expect(screen.getByText(/Error type: RateLimitError/i)).toBeInTheDocument()
  })

  it('should show retry button on error', () => {
    const errorResponse = {
      model: 'anthropic/claude-sonnet',
      error: 'Failed to generate',
      error_message: 'Failed to generate'
    }
    render(<Stage3 finalResponse={errorResponse} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(screen.getByText(/Retry Synthesis/i)).toBeInTheDocument()
  })

  it('should handle retry button click', async () => {
    const errorResponse = {
      model: 'anthropic/claude-sonnet',
      error: 'Failed'
    }
    const mockRetry = vi.fn().mockResolvedValue({
      status: 'success',
      stage3: { response: 'Retried response' }
    })
    vi.mocked(api.retryStage3).mockImplementation(mockRetry)

    const onRetrySuccess = vi.fn()
    render(<Stage3 finalResponse={errorResponse} conversationId="123" onRetrySuccess={onRetrySuccess} />)
    
    const retryButton = screen.getByText(/Retry Synthesis/i)
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledWith('123')
      expect(onRetrySuccess).toHaveBeenCalled()
    })
  })

  it('should return null when no finalResponse provided', () => {
    const { container } = render(<Stage3 finalResponse={null} conversationId="123" onRetrySuccess={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
