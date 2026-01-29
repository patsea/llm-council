import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Stage2 from './Stage2'

describe('Stage2 Component - Peer Rankings', () => {
  const mockRankings = [
    {
      model: 'openai/gpt-4',
      ranking: 'Response A provided the best analysis...',
      parsed_ranking: ['Response A', 'Response B', 'Response C']
    },
    {
      model: 'anthropic/claude-3',
      ranking: 'Response B was most comprehensive...',
      parsed_ranking: ['Response B', 'Response A', 'Response C']
    }
  ]

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'anthropic/claude-3',
    'Response C': 'google/gemini-pro'
  }

  const mockAggregateRankings = [
    { model: 'openai/gpt-4', average_rank: 1.5, rankings_count: 2 },
    { model: 'anthropic/claude-3', average_rank: 2.0, rankings_count: 2 }
  ]

  it('should render Stage 2 title', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument()
  })

  it('should render tabs for each ranking model', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    const gpt4Tab = screen.getByRole('button', { name: /gpt-4/i })
    expect(gpt4Tab).toBeInTheDocument()
  })

  it('should switch between ranking tabs', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    
    // Initially shows first ranking
    expect(screen.getByText(/best analysis/i)).toBeInTheDocument()
    
    // Click second tab - use getAllByRole to find buttons
    const buttons = screen.getAllByRole('button')
    const claudeTab = buttons.find(btn => btn.textContent?.includes('claude-3'))
    if (claudeTab) {
      fireEvent.click(claudeTab)
    }
    
    // Should show second ranking
    expect(screen.getByText(/most comprehensive/i)).toBeInTheDocument()
  })

  it('should display extracted rankings', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument()
  })

  it('should display aggregate rankings section', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    expect(screen.getByText(/Aggregate Rankings/i)).toBeInTheDocument()
    expect(screen.getByText(/Street Cred/i)).toBeInTheDocument()
  })

  it('should show average rank scores', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />)
    // Use regex to find the text content
    const avgTexts = screen.getAllByText(/Avg: \d+\.\d+/i)
    expect(avgTexts.length).toBeGreaterThan(0)
  })

  it('should return null when no rankings provided', () => {
    const { container } = render(<Stage2 rankings={[]} labelToModel={{}} aggregateRankings={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
