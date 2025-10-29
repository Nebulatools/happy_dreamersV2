import { render, screen } from '@testing-library/react'
import { EventGlobe } from '@/components/calendar/EventGlobe'

const baseEvent = {
  _id: 'evt-1',
  childId: 'child-1',
  eventType: 'nap',
  emotionalState: 'happy',
  startTime: '2025-03-01T10:00:00.000Z',
  endTime: '2025-03-01T11:00:00.000Z',
  notes: ''
}

describe('EventGlobe', () => {
  const startLabel = new Date(baseEvent.startTime).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const endLabel = new Date(baseEvent.endTime!).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  it('shows event name in full mode', () => {
    render(<EventGlobe event={baseEvent} hourHeight={30} viewMode="full" />)
    expect(screen.getByText('Siesta')).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes(startLabel) && content.includes(endLabel))
    ).toBeInTheDocument()
  })

  it('hides event name but keeps times in compact mode', () => {
    render(<EventGlobe event={baseEvent} hourHeight={22} viewMode="compact" />)
    expect(screen.queryByText('Siesta')).not.toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes(startLabel) && content.includes(endLabel))
    ).toBeInTheDocument()
  })
})
