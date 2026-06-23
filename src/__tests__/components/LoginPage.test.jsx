import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../../pages/LoginPage.jsx'

vi.mock('../../version.js', () => ({ APP_VERSION: 'test-version' }))
vi.mock('../../components/organisms/HowToWizard.jsx', () => ({
  default: ({ onClose }) => <button onClick={onClose}>close-wizard</button>,
}))

const mockDrives = vi.fn(() => ({ drives: [], loading: false }))
const mockCreateDrive = vi.fn(() => 'new-drive-uuid')

vi.mock('../../hooks/useDrives.js', () => ({
  useDrives: (...args) => mockDrives(...args),
  createDrive: (...args) => mockCreateDrive(...args),
  archiveDrive: vi.fn(),
}))

beforeEach(() => {
  mockDrives.mockReturnValue({ drives: [], loading: false })
  mockCreateDrive.mockReturnValue('new-drive-uuid')
})

function setup() {
  const onLogin = vi.fn()
  render(<LoginPage onLogin={onLogin} />)
  return { onLogin }
}

async function goToStep2(user) {
  await user.type(screen.getByLabelText(/username/i), 'gera')
  await user.type(screen.getByLabelText(/password/i), 'qwe123')
  await user.click(screen.getByRole('button', { name: /next/i }))
}

describe('LoginPage — step 1', () => {
  it('renders username and password inputs plus Next button', () => {
    setup()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('shows an error for wrong password', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByLabelText(/username/i), 'gera')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Invalid username or password.')).toBeInTheDocument()
  })

  it('shows an error for an unknown username', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'qwe123')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Invalid username or password.')).toBeInTheDocument()
  })

  it('advances to step 2 on valid credentials', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    expect(screen.getByRole('button', { name: /driver/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /controller/i })).toBeInTheDocument()
  })
})

describe('LoginPage — step 2', () => {
  it('shows the username in the role prompt', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    expect(screen.getByText(/gera/)).toBeInTheDocument()
  })

  it('clicking Driver advances to step 3 drive list', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /driver/i }))
    expect(screen.getByText(/select your drive/i)).toBeInTheDocument()
  })

  it('clicking Controller advances to step 3 drive list', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /controller/i }))
    expect(screen.getByText(/your drives/i)).toBeInTheDocument()
  })

  it('back button returns to step 1', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

describe('LoginPage — step 3 driver', () => {
  async function goToDriverStep3(user) {
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /driver/i }))
  }

  it('shows empty state when no drives assigned', async () => {
    const user = userEvent.setup()
    setup()
    await goToDriverStep3(user)
    expect(screen.getByText(/no drives assigned/i)).toBeInTheDocument()
  })

  it('shows drive cards when drives exist', async () => {
    mockDrives.mockReturnValue({
      drives: [{ id: 'd1', name: 'Frankfurt city drive', driver: 'gera', controller: 'lacko', createdAt: 1000 }],
      loading: false,
    })
    const user = userEvent.setup()
    setup()
    await goToDriverStep3(user)
    expect(screen.getByText('Frankfurt city drive')).toBeInTheDocument()
  })

  it('clicking a drive calls onLogin with driver role and drive info', async () => {
    mockDrives.mockReturnValue({
      drives: [{ id: 'd1', name: 'Frankfurt city drive', driver: 'gera', controller: 'lacko', createdAt: 1000 }],
      loading: false,
    })
    const user = userEvent.setup()
    const { onLogin } = setup()
    await goToDriverStep3(user)
    await user.click(screen.getByText('Frankfurt city drive'))
    expect(onLogin).toHaveBeenCalledWith('gera', 'qwe123', 'driver', 'd1', 'Frankfurt city drive')
  })

  it('back button returns to step 2', async () => {
    const user = userEvent.setup()
    setup()
    await goToDriverStep3(user)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /driver/i })).toBeInTheDocument()
  })
})

describe('LoginPage — step 3 controller', () => {
  async function goToControllerStep3(user) {
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /controller/i }))
  }

  it('shows + New drive button', async () => {
    const user = userEvent.setup()
    setup()
    await goToControllerStep3(user)
    expect(screen.getByRole('button', { name: /new drive/i })).toBeInTheDocument()
  })

  it('existing drive cards are shown', async () => {
    mockDrives.mockReturnValue({
      drives: [{ id: 'd2', name: 'Budapest run', driver: 'lacc', controller: 'gera', createdAt: 2000 }],
      loading: false,
    })
    const user = userEvent.setup()
    setup()
    await goToControllerStep3(user)
    expect(screen.getByText('Budapest run')).toBeInTheDocument()
  })

  it('clicking an existing drive calls onLogin', async () => {
    mockDrives.mockReturnValue({
      drives: [{ id: 'd2', name: 'Budapest run', driver: 'lacc', controller: 'gera', createdAt: 2000 }],
      loading: false,
    })
    const user = userEvent.setup()
    const { onLogin } = setup()
    await goToControllerStep3(user)
    await user.click(screen.getByText('Budapest run'))
    expect(onLogin).toHaveBeenCalledWith('gera', 'qwe123', 'controller', 'd2', 'Budapest run')
  })

  it('opens create form on + New drive click', async () => {
    const user = userEvent.setup()
    setup()
    await goToControllerStep3(user)
    await user.click(screen.getByRole('button', { name: /new drive/i }))
    expect(screen.getByLabelText(/drive name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/driver/i)).toBeInTheDocument()
  })

  it('Start drive button is disabled when form is empty', async () => {
    const user = userEvent.setup()
    setup()
    await goToControllerStep3(user)
    await user.click(screen.getByRole('button', { name: /new drive/i }))
    expect(screen.getByRole('button', { name: /start drive/i })).toBeDisabled()
  })

  it('filling the form and submitting calls createDrive then onLogin', async () => {
    const user = userEvent.setup()
    const { onLogin } = setup()
    await goToControllerStep3(user)
    await user.click(screen.getByRole('button', { name: /new drive/i }))
    await user.type(screen.getByLabelText(/drive name/i), 'Frankfurt city drive')
    await user.selectOptions(screen.getByLabelText(/driver/i), 'lacko')
    await user.click(screen.getByRole('button', { name: /start drive/i }))
    expect(mockCreateDrive).toHaveBeenCalledWith('Frankfurt city drive', 'lacko', 'gera')
    expect(onLogin).toHaveBeenCalledWith('gera', 'qwe123', 'controller', 'new-drive-uuid', 'Frankfurt city drive')
  })
})
