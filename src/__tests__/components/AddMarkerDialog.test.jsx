import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddMarkerDialog from '../../components/organisms/AddMarkerDialog.jsx'

function setup(props = {}) {
  const onAdd = vi.fn()
  const onClose = vi.fn()
  render(
    <AddMarkerDialog
      open={true}
      onAdd={onAdd}
      onClose={onClose}
      defaultCoords=""
      {...props}
    />,
  )
  return { onAdd, onClose }
}

describe('AddMarkerDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <AddMarkerDialog open={false} onAdd={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the dialog title when open', () => {
    setup()
    expect(screen.getByText('Add new marker')).toBeInTheDocument()
  })

  it('shows an error for invalid coordinates', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/47\.49790/), 'not valid')
    expect(screen.getByText(/Enter coordinates as/i)).toBeInTheDocument()
  })

  it('Save button is disabled for invalid coordinates', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/47\.49790/), 'abc')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows no error for empty coordinates input', () => {
    setup()
    expect(screen.queryByText(/Enter coordinates/i)).not.toBeInTheDocument()
  })

  it('Save button is disabled when coordinates are empty', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('Save button is enabled for valid coordinates', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/47\.49790/), '47.49, 19.04')
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('calls onAdd with correct lat, lon and closes on Save', async () => {
    const user = userEvent.setup()
    const { onAdd, onClose } = setup()
    await user.type(screen.getByPlaceholderText(/47\.49790/), '47.49, 19.04')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onAdd).toHaveBeenCalledWith(47.49, 19.04, expect.objectContaining({ type: 'roadworks' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose and not onAdd when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onAdd, onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('prefills the coordinate input with defaultCoords', () => {
    setup({ defaultCoords: '47.49, 19.04' })
    expect(screen.getByPlaceholderText(/47\.49790/).value).toBe('47.49, 19.04')
  })

  it('passes the selected type to onAdd', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    await user.type(screen.getByPlaceholderText(/47\.49790/), '47.49, 19.04')
    await user.selectOptions(screen.getByRole('combobox'), 'closure')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onAdd).toHaveBeenCalledWith(47.49, 19.04, expect.objectContaining({ type: 'closure' }))
  })
})
