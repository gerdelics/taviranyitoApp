import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../../pages/LoginPage.jsx'

vi.mock('../../version.js', () => ({ APP_VERSION: 'test-version' }))
vi.mock('../../components/organisms/HowToWizard.jsx', () => ({
  default: ({ onClose }) => <button onClick={onClose}>close-wizard</button>,
}))

function setup() {
  const onLogin = vi.fn()
  render(<LoginPage onLogin={onLogin} />)
  return { onLogin }
}

describe('LoginPage — step 1', () => {
  it('renders username and password inputs plus Next button', () => {
    setup()
    expect(screen.getByPlaceholderText(/sofor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('shows an error and stays on step 1 for wrong password', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/sofor/i), 'sofor')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Invalid username or password.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('shows an error for an unknown username', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/sofor/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'qwe123')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Invalid username or password.')).toBeInTheDocument()
  })

  it('advances to step 2 on valid credentials', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText(/sofor/i), 'sofor')
    await user.type(screen.getByLabelText(/password/i), 'qwe123')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByRole('button', { name: /driver/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /controller/i })).toBeInTheDocument()
  })
})

describe('LoginPage — step 2', () => {
  async function goToStep2(user) {
    await user.type(screen.getByPlaceholderText(/sofor/i), 'sofor')
    await user.type(screen.getByLabelText(/password/i), 'qwe123')
    await user.click(screen.getByRole('button', { name: /next/i }))
  }

  it('shows the username in the role prompt', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    expect(screen.getByText(/sofor/)).toBeInTheDocument()
  })

  it('clicking Controller calls onLogin with controller role immediately', async () => {
    const user = userEvent.setup()
    const { onLogin } = setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /controller/i }))
    expect(onLogin).toHaveBeenCalledWith('sofor', 'qwe123', 'controller')
  })

  it('clicking Driver advances to step 3', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /driver/i }))
    expect(screen.getByText(/sharing your position/i)).toBeInTheDocument()
  })

  it('back button returns to step 1', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

describe('LoginPage — step 3', () => {
  async function goToStep3(user) {
    await user.type(screen.getByPlaceholderText(/sofor/i), 'sofor')
    await user.type(screen.getByLabelText(/password/i), 'qwe123')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /driver/i }))
  }

  it('shows the partner name', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep3(user)
    expect(screen.getByRole('button', { name: /iranyito/i })).toBeInTheDocument()
  })

  it('confirming partner calls onLogin with driver role', async () => {
    const user = userEvent.setup()
    const { onLogin } = setup()
    await goToStep3(user)
    await user.click(screen.getByRole('button', { name: /iranyito/i }))
    expect(onLogin).toHaveBeenCalledWith('sofor', 'qwe123', 'driver')
  })

  it('back button returns to step 2', async () => {
    const user = userEvent.setup()
    setup()
    await goToStep3(user)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /driver/i })).toBeInTheDocument()
  })
})
