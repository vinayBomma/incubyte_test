import { render, screen, waitFor, within } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/client'
import { OPTIONS, makeEmployee, makePage } from '../test/fixtures'
import EmployeesPage from './EmployeesPage'

const userEvent = userEventLib.setup({ delay: null })

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    listEmployees: vi.fn(),
    getOptions: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    deleteEmployee: vi.fn(),
  }
})

const listEmployees = vi.mocked(api.listEmployees)
const createEmployee = vi.mocked(api.createEmployee)
const updateEmployee = vi.mocked(api.updateEmployee)
const deleteEmployee = vi.mocked(api.deleteEmployee)

beforeEach(() => {
  vi.mocked(api.getOptions).mockResolvedValue(OPTIONS)
})

describe('EmployeesPage', () => {
  it('shows a loading state, then rows with formatted salaries', async () => {
    listEmployees.mockResolvedValue(
      makePage([
        makeEmployee(),
        makeEmployee({ id: 2, full_name: 'Kenji Sato', country: 'Japan', salary: 9_000_000, currency: 'JPY' }),
      ]),
    )

    render(<EmployeesPage />)

    expect(screen.getByText(/loading employees/i)).toBeInTheDocument()
    const row = await screen.findByRole('row', { name: /kenji sato/i })
    expect(within(row).getByText('¥9,000,000')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /ann lee/i })).toHaveTextContent('$120,000')
  })

  it('shows an empty state when no employees match', async () => {
    listEmployees.mockResolvedValue(makePage([]))

    render(<EmployeesPage />)

    expect(await screen.findByText(/no employees match/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error with a retry that refetches', async () => {
    listEmployees
      .mockRejectedValueOnce(new api.ApiError(500, 'Database unavailable'))
      .mockResolvedValueOnce(makePage([makeEmployee()]))

    render(<EmployeesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByRole('row', { name: /ann lee/i })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pages through results on the server', async () => {
    listEmployees.mockImplementation(async ({ page = 1 }) =>
      makePage([makeEmployee({ full_name: `Person on page ${page}` })], { total: 60, page }),
    )

    render(<EmployeesPage />)

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByText(/60 employees/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('row', { name: /person on page 2/i })).toBeInTheDocument()
    expect(listEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()
  })

  it('filters by country, job title and department, resetting to page 1', async () => {
    listEmployees.mockImplementation(async ({ page = 1 }) =>
      makePage([makeEmployee()], { total: 60, page }),
    )
    render(<EmployeesPage />)
    await userEvent.click(await screen.findByRole('button', { name: /next/i }))
    await screen.findByText(/page 2 of 3/i)

    await userEvent.selectOptions(await screen.findByLabelText(/country/i), 'Japan')
    await userEvent.selectOptions(screen.getByLabelText(/job title/i), 'Data Analyst')
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'Finance')

    await screen.findByText(/page 1 of 3/i)
    expect(listEmployees).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, country: 'Japan', job_title: 'Data Analyst', department: 'Finance' }),
    )
  })

  it('searches by name and resets to page 1', async () => {
    listEmployees.mockImplementation(async ({ page = 1 }) =>
      makePage([makeEmployee()], { total: 60, page }),
    )
    render(<EmployeesPage />)
    await userEvent.click(await screen.findByRole('button', { name: /next/i }))
    await screen.findByText(/page 2 of 3/i)

    await userEvent.type(screen.getByRole('searchbox', { name: /search by name/i }), 'ann')

    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'ann' })),
    )
  })
})

describe('EmployeesPage editing', () => {
  const ann = makeEmployee()

  it('adds an employee and refreshes the list', async () => {
    listEmployees
      .mockResolvedValueOnce(makePage([ann]))
      .mockResolvedValueOnce(makePage([ann, makeEmployee({ id: 2, full_name: 'Bo Chen' })]))
    createEmployee.mockResolvedValue(makeEmployee({ id: 2, full_name: 'Bo Chen' }))
    render(<EmployeesPage />)

    await userEvent.click(await screen.findByRole('button', { name: /add employee/i }))
    const dialog = screen.getByRole('dialog', { name: /add employee/i })
    await userEvent.type(within(dialog).getByLabelText(/full name/i), 'Bo Chen')
    await userEvent.type(within(dialog).getByLabelText(/job title/i), 'Data Analyst')
    await userEvent.type(within(dialog).getByLabelText(/department/i), 'Finance')
    await userEvent.selectOptions(within(dialog).getByLabelText(/country/i), 'United States')
    await userEvent.type(within(dialog).getByLabelText(/salary/i), '90000')
    await userEvent.type(within(dialog).getByLabelText(/hire date/i), '2021-03-01')
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }))

    expect(await screen.findByRole('row', { name: /bo chen/i })).toBeInTheDocument()
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Bo Chen', salary: 9_000_000 }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits an employee from its row', async () => {
    listEmployees.mockResolvedValue(makePage([ann]))
    updateEmployee.mockResolvedValue({ ...ann, full_name: 'Ann Lee-Park' })
    render(<EmployeesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Ann Lee' }))
    const name = within(screen.getByRole('dialog', { name: /edit employee/i })).getByLabelText(/full name/i)
    await userEvent.clear(name)
    await userEvent.type(name, 'Ann Lee-Park')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateEmployee).toHaveBeenCalledWith(ann.id, expect.objectContaining({ full_name: 'Ann Lee-Park' }))
    expect(listEmployees).toHaveBeenCalledTimes(2)
  })

  it('asks for confirmation before deleting', async () => {
    listEmployees.mockResolvedValueOnce(makePage([ann])).mockResolvedValueOnce(makePage([]))
    deleteEmployee.mockResolvedValue(undefined)
    render(<EmployeesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Ann Lee' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: /delete employee/i })).getByRole('button', { name: /cancel/i }))
    expect(deleteEmployee).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Ann Lee' }))
    const dialog = screen.getByRole('dialog', { name: /delete employee/i })
    expect(dialog).toHaveTextContent('Ann Lee')
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByText(/no employees match/i)).toBeInTheDocument()
    expect(deleteEmployee).toHaveBeenCalledWith(ann.id)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the confirmation open and shows the error when delete fails', async () => {
    listEmployees.mockResolvedValue(makePage([ann]))
    deleteEmployee.mockRejectedValue(new api.ApiError(404, 'Employee 1 not found'))
    render(<EmployeesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Ann Lee' }))
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    const dialog = screen.getByRole('dialog', { name: /delete employee/i })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Employee 1 not found')
  })

  it('goes back a page after deleting the only row on the last page', async () => {
    listEmployees.mockImplementation(async ({ page = 1 }) =>
      makePage([makeEmployee({ full_name: `Person on page ${page}` })], { total: 26, page }),
    )
    deleteEmployee.mockResolvedValue(undefined)
    render(<EmployeesPage />)
    await userEvent.click(await screen.findByRole('button', { name: /next/i }))
    await screen.findByText(/page 2 of 2/i)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Person on page 2' }))
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByRole('row', { name: /person on page 1/i })).toBeInTheDocument()
    expect(listEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })
})
