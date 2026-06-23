import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PoiActionsDialog from '../../components/organisms/PoiActionsDialog.jsx'

const BASE_POI = {
  id: 'p1',
  lat: 47.4979,
  lon: 19.0402,
  done: false,
  description: 'Road closed',
  type: 'roadworks',
  approach: null,
  createdAt: 1000,
  published: false,
}

const BASE_PROPS = {
  open: true,
  draft: BASE_POI,
  number: 1,
  onChange: vi.fn(),
  onNavigate: vi.fn(),
  onPlaceApproach: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onDelete: vi.fn(),
  onMarkDone: vi.fn(),
  currentLocation: null,
}

describe('PoiActionsDialog — null draft', () => {
  it('renders nothing when draft is null', () => {
    const { container } = render(<PoiActionsDialog {...BASE_PROPS} draft={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('PoiActionsDialog — driver role', () => {
  function driverRender(overrides = {}) {
    const props = { ...BASE_PROPS, role: 'driver', ...overrides }
    const callbacks = {
      onNavigate: vi.fn(),
      onMarkDone: vi.fn(),
      onCancel: vi.fn(),
    }
    render(<PoiActionsDialog {...props} {...callbacks} />)
    return callbacks
  }

  it('shows the POI description', () => {
    driverRender()
    expect(screen.getByText('Road closed')).toBeInTheDocument()
  })

  it('shows the type label when description is empty', () => {
    driverRender({ draft: { ...BASE_POI, description: '' } })
    expect(screen.getByText('Roadworks')).toBeInTheDocument()
  })

  it('shows distance when currentLocation is set', () => {
    driverRender({ currentLocation: { lat: 47.5, lon: 19.05, accuracy: 5 } })
    expect(document.body).toHaveTextContent(/\d+(\.\d+)?\s*(km|m)/)
  })

  it('does not show distance when currentLocation is null', () => {
    driverRender({ currentLocation: null })
    expect(document.body).not.toHaveTextContent(/\d+\.\d+\s*km/)
  })

  it('shows the approach coordinates when approach is set', () => {
    driverRender({ draft: { ...BASE_POI, approach: { lat: 47.5, lon: 19.1 } } })
    expect(screen.getByText(/Approach/i)).toBeInTheDocument()
  })

  it('Drive button calls onNavigate with the draft', async () => {
    const user = userEvent.setup()
    const callbacks = driverRender()
    callbacks.onNavigate.mockResolvedValue('opened')
    await user.click(screen.getByRole('button', { name: 'Drive' }))
    expect(callbacks.onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
  })

  it('shows Copied! when onNavigate returns true', async () => {
    const user = userEvent.setup()
    const callbacks = driverRender()
    callbacks.onNavigate.mockResolvedValue(true)
    await user.click(screen.getByRole('button', { name: 'Drive' }))
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
  })

  it('shows Copy failed when onNavigate returns false', async () => {
    const user = userEvent.setup()
    const callbacks = driverRender()
    callbacks.onNavigate.mockResolvedValue(false)
    await user.click(screen.getByRole('button', { name: 'Drive' }))
    expect(await screen.findByText('Copy failed')).toBeInTheDocument()
  })

  it('does not show copy state when onNavigate returns opened', async () => {
    const user = userEvent.setup()
    const callbacks = driverRender()
    callbacks.onNavigate.mockResolvedValue('opened')
    await user.click(screen.getByRole('button', { name: 'Drive' }))
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    expect(screen.queryByText('Copy failed')).not.toBeInTheDocument()
  })

  it('Done button calls onMarkDone', async () => {
    const user = userEvent.setup()
    const callbacks = driverRender()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(callbacks.onMarkDone).toHaveBeenCalled()
  })

  it('shows Undo button when POI is done', () => {
    driverRender({ draft: { ...BASE_POI, done: true } })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('shows In progress status text when not done', () => {
    driverRender()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('shows Done status text when done', () => {
    driverRender({ draft: { ...BASE_POI, done: true } })
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
  })
})

describe('PoiActionsDialog — controller role', () => {
  function controllerRender(overrides = {}) {
    const callbacks = {
      onChange: vi.fn(),
      onNavigate: vi.fn(),
      onPlaceApproach: vi.fn(),
      onSave: vi.fn(),
      onCancel: vi.fn(),
      onDelete: vi.fn(),
      onMarkDone: vi.fn(),
    }
    render(
      <PoiActionsDialog
        {...BASE_PROPS}
        role="controller"
        {...overrides}
        {...callbacks}
      />,
    )
    return callbacks
  }

  it('shows a type select with 3 options', () => {
    controllerRender()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
  })

  it('shows description input', () => {
    controllerRender()
    expect(screen.getByDisplayValue('Road closed')).toBeInTheDocument()
  })

  it('onChange called with description on input change', async () => {
    const user = userEvent.setup()
    const { onChange } = controllerRender()
    const input = screen.getByDisplayValue('Road closed')
    await user.type(input, 'X')
    expect(onChange).toHaveBeenLastCalledWith({ description: 'Road closedX' })
  })

  it('onChange called with type on select change', async () => {
    const user = userEvent.setup()
    const { onChange } = controllerRender()
    await user.selectOptions(screen.getByRole('combobox'), 'closure')
    expect(onChange).toHaveBeenCalledWith({ type: 'closure' })
  })

  it('shows Add approach button when approach is null', () => {
    controllerRender()
    expect(screen.getByRole('button', { name: 'Add approach' })).toBeInTheDocument()
  })

  it('shows Remove button when approach is set', () => {
    controllerRender({ draft: { ...BASE_POI, approach: { lat: 47.5, lon: 19.1 } } })
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('Remove approach calls onChange with approach: null', async () => {
    const user = userEvent.setup()
    const { onChange } = controllerRender({ draft: { ...BASE_POI, approach: { lat: 47.5, lon: 19.1 } } })
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith({ approach: null })
  })

  it('Save calls onSave', async () => {
    const user = userEvent.setup()
    const { onSave } = controllerRender()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('Cancel calls onCancel', async () => {
    const user = userEvent.setup()
    const { onCancel } = controllerRender()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('Delete calls onDelete', async () => {
    const user = userEvent.setup()
    const { onDelete } = controllerRender()
    await user.click(screen.getByRole('button', { name: 'Delete marker' }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('shows Open in Google Maps label on mobile', () => {
    controllerRender({ isMobile: true })
    expect(screen.getByRole('button', { name: 'Open in Google Maps' })).toBeInTheDocument()
  })

  it('shows Copy Google Maps link label on desktop', () => {
    controllerRender({ isMobile: false })
    expect(screen.getByRole('button', { name: 'Copy Google Maps link' })).toBeInTheDocument()
  })

  it('Mark as done toggle calls onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = controllerRender()
    await user.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(onChange).toHaveBeenCalledWith({ done: true })
  })
})
