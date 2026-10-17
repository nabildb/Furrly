import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CountBadge } from './CountBadge'

describe('CountBadge', () => {
  it('no se pinta con 0 y resume a partir de 10', () => {
    const { container, rerender } = render(<CountBadge count={0} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<CountBadge count={3} />)
    expect(screen.getByLabelText('3 sin leer')).toHaveTextContent('3')

    rerender(<CountBadge count={12} />)
    expect(screen.getByLabelText('12 sin leer')).toHaveTextContent('9+')
  })
})
