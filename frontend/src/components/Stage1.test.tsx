import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import Stage1 from './Stage1'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Stage1 Component', () => {
  const mockResponses = [
    {
      model: 'openai/gpt-4',
      response: 'Response from GPT-4',
      cost: 0.0015
    },
    {
      model: 'anthropic/claude-3',
      response: 'Response from Claude',
      cost: 0.0012
    }
  ]

  const mockMetadata = {
    stage1_cost: 0.0027
  }

  it('should render Stage 1 title', () => {
    render(<Stage1 responses={mockResponses} stage1Errors={[]} metadata={mockMetadata} />)
    expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument()
  })

  it('should render tabs for each model response', () => {
    render(<Stage1 responses={mockResponses} stage1Errors={[]} metadata={mockMetadata} />)
    const tabs = screen.getByRole('button', { name: /gpt-4/i })
    expect(tabs).toBeInTheDocument()
  })

  it('should display cost for each model', () => {
    render(<Stage1 responses={mockResponses} stage1Errors={[]} metadata={mockMetadata} />)
    expect(screen.getByText(/\$0\.0015/)).toBeInTheDocument()
  })

  it('should switch tabs when clicked', () => {
    render(<Stage1 responses={mockResponses} stage1Errors={[]} metadata={mockMetadata} />)
    
    // Initially should show first response
    expect(screen.getByText('Response from GPT-4')).toBeInTheDocument()
    
    // Click second tab - use getAllByRole and get the second one
    const buttons = screen.getAllByRole('button')
    const claudeTab = buttons.find(btn => btn.textContent?.includes('claude-3'))
    if (claudeTab) {
      fireEvent.click(claudeTab)
    }
    
    // Should now show second response
    expect(screen.getByText('Response from Claude')).toBeInTheDocument()
  })

  it('should display total cost summary', () => {
    render(<Stage1 responses={mockResponses} stage1Errors={[]} metadata={mockMetadata} />)
    expect(screen.getByText(/Stage 1 Total Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/\$0\.0027/)).toBeInTheDocument()
  })

  it('should return null when no responses provided', () => {
    const { container } = render(<Stage1 responses={[]} stage1Errors={[]} metadata={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('should display errors when models fail', () => {
    const errors = [
      { model: 'openai/gpt-3.5', error: 'Rate limit exceeded' }
    ]
    render(<Stage1 responses={mockResponses} stage1Errors={errors} metadata={mockMetadata} />)
    
    expect(screen.getByText(/model\(s\) failed to respond/i)).toBeInTheDocument()
    expect(screen.getByText(/gpt-3\.5/i)).toBeInTheDocument()
    expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument()
  })
})
