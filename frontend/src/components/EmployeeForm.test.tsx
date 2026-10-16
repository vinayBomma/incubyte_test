import { render, screen } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { OPTIONS, makeEmployee } from '../test/fixtures'
import { EmployeeForm } from './EmployeeForm'

const TODAY = '2025-06-30'
const userEvent = userEventLib.setup({ delay: null })

function renderForm(props: Partial<React.ComponentProps<typeof EmployeeForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(
    <EmployeeForm options={OPTIONS} today={TODAY} onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  )
  return { onSubmit: props.onSubmit ?? onSubmit, onCancel }
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/full name/i), 'Ann Lee')
  await userEvent.type(screen.getByLabelText(/job title/i), 'Software Engineer')
  await userEvent.type(screen.getByLabelText(/department/i), 'Engineering')
  await userEvent.selectOptions(screen.getByLabelText(/country/i), 'India')
  await userEvent.type(screen.getByLabelText(/salary/i), '1500000.50')
  await userEvent.type(screen.getByLabelText(/hire date/i), '2020-01-15')
}

describe('EmployeeForm', () => {
  it('shows field errors and does not submit an invalid form', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByLabelText(/full name/i)).toHaveAccessibleDescription('Required')
    expect(screen.getByLabelText(/country/i)).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a payload in minor units with the country currency', async () => {
    const { onSubmit } = renderForm()
    expect(screen.getByRole('dialog', { name: /add employee/i })).toBeInTheDocument()

    await fillValidForm()
    expect(screen.getByText('INR')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      full_name: 'Ann Lee',
      job_title: 'Software Engineer',
      department: 'Engineering',
      country: 'India',
      salary: 150_000_050,
      currency: 'INR',
      hired_on: '2020-01-15',
    })
  })

  it('shows server validation errors next to the matching field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, 'Please fix the highlighted fields.', { full_name: 'Name already taken' }),
    )
    renderForm({ onSubmit })

    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Name already taken')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows other server errors as an alert and re-enables saving', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(500, 'Database unavailable'))
    renderForm({ onSubmit })

    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled()
  })

  it('prefills the form when editing', () => {
    renderForm({ employee: makeEmployee({ country: 'Japan', currency: 'JPY', salary: 9_000_000 }) })

    expect(screen.getByRole('dialog', { name: /edit employee/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Ann Lee')
    expect(screen.getByLabelText(/country/i)).toHaveValue('Japan')
    expect(screen.getByLabelText(/salary/i)).toHaveValue('9000000')
    expect(screen.getByLabelText(/hire date/i)).toHaveValue('2020-01-15')
  })

  it('cancels on Escape', async () => {
    const { onCancel } = renderForm()

    await userEvent.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalled()
  })
})
