import { render, screen } from '@testing-library/react'
import { EventFormSection } from '@/components/events/EventFormSection'

describe('EventFormSection', () => {
  it('should render title and children correctly', () => {
    render(
      <EventFormSection title="Test Section">
        <div data-testid="child-content">Test Content</div>
      </EventFormSection>
    )
    
    // Verificar que el título se renderiza
    expect(screen.getByText('Test Section')).toBeInTheDocument()
    
    // Verificar que los children se renderizan
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(
      <EventFormSection title="Styled Section">
        <div>Content</div>
      </EventFormSection>
    )
    
    // Verificar estructura de clases
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('space-y-3')
    
    const title = screen.getByText('Styled Section')
    expect(title).toHaveClass('text-sm', 'font-medium', 'text-muted-foreground')
    
    // Verificar que el contenedor de contenido tiene las clases correctas
    const contentWrapper = container.querySelector('.rounded-lg.border.bg-card.p-4')
    expect(contentWrapper).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(
      <EventFormSection title="Custom Class Section" className="custom-class">
        <div>Content</div>
      </EventFormSection>
    )
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('space-y-3', 'custom-class')
  })

  it('should render multiple children', () => {
    render(
      <EventFormSection title="Multiple Children">
        <input data-testid="input-1" type="text" />
        <input data-testid="input-2" type="text" />
        <button data-testid="button">Submit</button>
      </EventFormSection>
    )
    
    expect(screen.getByTestId('input-1')).toBeInTheDocument()
    expect(screen.getByTestId('input-2')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toBeInTheDocument()
  })

  it('should handle empty children', () => {
    const { container } = render(
      <EventFormSection title="Empty Section">
        {null}
      </EventFormSection>
    )
    
    // El componente debería renderizarse sin errores
    expect(screen.getByText('Empty Section')).toBeInTheDocument()
    
    // El contenedor de contenido debería existir pero estar vacío
    const contentWrapper = container.querySelector('.rounded-lg.border.bg-card.p-4')
    expect(contentWrapper).toBeInTheDocument()
    expect(contentWrapper?.textContent).toBe('')
  })

  it('should maintain semantic HTML structure', () => {
    const { container } = render(
      <EventFormSection title="Semantic Test">
        <label htmlFor="test-input">Test Label</label>
        <input id="test-input" type="text" />
      </EventFormSection>
    )
    
    // Verificar que la estructura semántica se mantiene
    const label = screen.getByText('Test Label')
    const input = container.querySelector('#test-input')
    
    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(label).toHaveAttribute('for', 'test-input')
  })
})