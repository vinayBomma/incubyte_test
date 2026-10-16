import { useState } from 'react'
import { createEmployee, deleteEmployee, getOptions, listEmployees, updateEmployee } from '../api/client'
import type { Employee, EmployeeInput, EmployeePage } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmployeeFilters, type Filters } from '../components/EmployeeFilters'
import { EmployeeForm } from '../components/EmployeeForm'
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback'
import { Pagination } from '../components/Pagination'
import { type AsyncState, useAsync } from '../hooks/useAsync'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatMoney } from '../lib/money'

const SEARCH_DEBOUNCE_MS = 300
const EMPTY_FILTERS: Filters = { country: '', job_title: '', department: '' }

type Editing = { mode: 'create' } | { mode: 'edit'; employee: Employee }

export default function EmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [editing, setEditing] = useState<Editing>()
  const [deleting, setDeleting] = useState<Employee>()
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const options = useAsync(getOptions, [])
  const employees = useAsync(
    () => listEmployees({ page, search: debouncedSearch, ...filters }),
    [page, debouncedSearch, filters],
  )

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  async function saveEmployee(input: EmployeeInput) {
    if (editing?.mode === 'edit') await updateEmployee(editing.employee.id, input)
    else await createEmployee(input)
    setEditing(undefined)
    employees.reload()
  }

  async function confirmDelete(employee: Employee) {
    await deleteEmployee(employee.id)
    setDeleting(undefined)
    const removedLastRowOnPage = employees.data?.items.length === 1 && page > 1
    if (removedLastRowOnPage) setPage(page - 1)
    else employees.reload()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Employees</h2>
        <button
          type="button"
          disabled={!options.data}
          onClick={() => setEditing({ mode: 'create' })}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Add employee
        </button>
      </div>
      {options.error && <ErrorMessage error={options.error} onRetry={options.reload} />}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-gray-600">
          Search by name
          <input
            type="search"
            className="mt-1 w-64 rounded border px-2 py-1 text-gray-900"
            placeholder="e.g. Priya"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </label>
        <EmployeeFilters filters={filters} options={options.data} onChange={updateFilter} />
      </div>
      <EmployeeResults
        {...employees}
        onPageChange={setPage}
        onEdit={(employee) => setEditing({ mode: 'edit', employee })}
        onDelete={setDeleting}
      />
      {editing && options.data && (
        <EmployeeForm
          employee={editing.mode === 'edit' ? editing.employee : undefined}
          options={options.data}
          onSubmit={saveEmployee}
          onCancel={() => setEditing(undefined)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete employee"
          confirmLabel="Delete"
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(undefined)}
        >
          Permanently delete <strong>{deleting.full_name}</strong> ({deleting.job_title}, {deleting.country})?
          This cannot be undone.
        </ConfirmDialog>
      )}
    </section>
  )
}

interface RowActions {
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

interface EmployeeResultsProps extends AsyncState<EmployeePage>, RowActions {
  onPageChange: (page: number) => void
}

function EmployeeResults({ data, error, loading, reload, onPageChange, ...actions }: EmployeeResultsProps) {
  if (loading) return <Loading label="Loading employees…" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (!data || data.items.length === 0) return <EmptyState>No employees match these filters.</EmptyState>
  return (
    <>
      <EmployeeTable employees={data.items} {...actions} />
      <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={onPageChange} />
    </>
  )
}

function EmployeeTable({ employees, onEdit, onDelete }: RowActions & { employees: Employee[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
      <thead className="border-b text-gray-600">
        <tr>
          <th>Name</th>
          <th>Job title</th>
          <th>Department</th>
          <th>Country</th>
          <th className="text-right">Salary</th>
          <th>Hired</th>
          <th>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr key={employee.id} className="border-b last:border-0">
            <td className="font-medium">{employee.full_name}</td>
            <td>{employee.job_title}</td>
            <td>{employee.department}</td>
            <td>{employee.country}</td>
            <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(employee.salary, employee.currency)}</td>
            <td className="whitespace-nowrap">{employee.hired_on}</td>
            <td className="whitespace-nowrap text-right">
              <button
                type="button"
                aria-label={`Edit ${employee.full_name}`}
                onClick={() => onEdit(employee)}
                className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Delete ${employee.full_name}`}
                onClick={() => onDelete(employee)}
                className="rounded px-2 py-1 text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}
