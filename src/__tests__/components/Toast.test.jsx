import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../../components/organisms/Toast.jsx'

describe('Toast', () => {
  it('renders nothing when toasts array is empty', () => {
    const { container } = render(<Toast toasts={[]} onDismiss={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a single toast message', () => {
    render(<Toast toasts={[{ id: 1, message: 'New POI: foo' }]} onDismiss={vi.fn()} />)
    expect(screen.getByText(/New POI: foo/)).toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    render(
      <Toast
        toasts={[
          { id: 1, message: 'First' },
          { id: 2, message: 'Second' },
        ]}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/First/)).toBeInTheDocument()
    expect(screen.getByText(/Second/)).toBeInTheDocument()
  })

  it('calls onDismiss with the toast id when the dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<Toast toasts={[{ id: 42, message: 'Test' }]} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(onDismiss).toHaveBeenCalledWith(42)
  })
})
