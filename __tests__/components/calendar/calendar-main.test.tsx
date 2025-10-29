import { render } from '@testing-library/react'
import { CalendarMain } from '@/components/calendar/CalendarMain'

const baseProps = {
  events: [],
  initialDate: new Date('2025-03-01T00:00:00.000Z'),
  initialView: 'week' as const,
  monthView: <div>Month view</div>
}

describe('CalendarMain', () => {
  it('sets data attribute with current view mode', () => {
    const { container } = render(
      <CalendarMain {...baseProps} viewMode="compact" />
    )

    expect(container.firstChild).toHaveAttribute('data-calendar-view-mode', 'compact')
  })
})
