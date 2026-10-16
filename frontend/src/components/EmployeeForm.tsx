import { type FormEvent, type ReactNode, useId, useState } from 'react'
import { ApiError } from '../api/client'
import type { Employee, EmployeeInput, FieldErrors, Options } from '../api/types'
import { toMajorInput } from '../lib/money'
import { type EmployeeFormValues, validateEmployee } from '../lib/validation'
import { Modal } from './Modal'

interface EmployeeFormProps {
  employee?: Employee
  options: Options
  onSubmit: (input: EmployeeInput) => Promise<void>
  onCancel: () => void
  today?: string
}

const EMPTY_VALUES: EmployeeFormValues = {
  full_name: '',
  job_title: '',
  department: '',
  country: '',
  salary: '',
  hired_on: '',
}

function toFormValues(employee: Employee | undefined): EmployeeFormValues {
  if (!employee) return EMPTY_VALUES
  return { ...employee, salary: toMajorInput(employee.salary, employee.currency) }
}

function localToday(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Splits server errors into ones we can show on a field and ones we can't. */
function splitServerErrors(fieldErrors: FieldErrors): { fields: FieldErrors; other: string[] } {
  const fields: FieldErrors = {}
  const other: string[] = []
  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = key === 'currency' ? 'country' : key
    if (field in EMPTY_VALUES) fields[field] = message
    else other.push(message)
  }
  return { fields, other }
}

export function EmployeeForm({ employee, options, onSubmit, onCancel, today = localToday() }: EmployeeFormProps) {
  const [values, setValues] = useState(() => toFormValues(employee))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const currency = options.countries.find((c) => c.name === values.country)?.currency

  function setValue(name: keyof EmployeeFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(undefined)
    const result = validateEmployee(values, options.countries, today)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit(result.input)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const { fields, other } = splitServerErrors(error.fieldErrors)
        setErrors(fields)
        if (other.length > 0) setFormError(other.join(' '))
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name: keyof EmployeeFormValues) => ({
    value: values[name],
    error: errors[name],
    onChange: (value: string) => setValue(name, value),
  })

  return (
    <Modal title={employee ? 'Edit employee' : 'Add employee'} onClose={onCancel}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        {formError && (
          <p role="alert" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {formError}
          </p>
        )}
        <TextField label="Full name" {...field('full_name')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Job title" {...field('job_title')} />
          <TextField label="Department" {...field('department')} />
        </div>
        <Field label="Country" error={errors.country}>
          {(props) => (
            <select {...props} value={values.country} onChange={(e) => setValue('country', e.target.value)}>
              <option value="">Select a country</option>
              {options.countries.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salary (annual)" error={errors.salary} suffix={currency}>
            {(props) => (
              <input
                {...props}
                inputMode="decimal"
                value={values.salary}
                onChange={(e) => setValue('salary', e.target.value)}
              />
            )}
          </Field>
          <Field label="Hire date" error={errors.hired_on}>
            {(props) => (
              <input
                {...props}
                type="date"
                max={today}
                value={values.hired_on}
                onChange={(e) => setValue('hired_on', e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface ControlProps {
  id: string
  className: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FieldProps {
  label: string
  error: string | undefined
  suffix?: string
  children: (props: ControlProps) => ReactNode
}

function Field({ label, error, suffix, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col text-sm">
      <label htmlFor={id} className="mb-1 text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {children({
          id,
          className: `w-full rounded border px-2 py-1 ${error ? 'border-red-500' : ''}`,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
        })}
        {suffix && <span className="text-gray-500">{suffix}</span>}
      </div>
      {error && (
        <span id={errorId} className="mt-1 text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
}

function TextField({ label, value, error, onChange }: TextFieldProps) {
  return (
    <Field label={label} error={error}>
      {(props) => <input {...props} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}
