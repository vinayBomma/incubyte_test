import type { Options } from '../api/types'

export interface Filters {
  country: string
  job_title: string
  department: string
}

interface EmployeeFiltersProps {
  filters: Filters
  options: Options | undefined
  onChange: (name: keyof Filters, value: string) => void
}

export function EmployeeFilters({ filters, options, onChange }: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="Country"
        value={filters.country}
        choices={options?.countries.map((c) => c.name) ?? []}
        onChange={(value) => onChange('country', value)}
      />
      <FilterSelect
        label="Job title"
        value={filters.job_title}
        choices={options?.job_titles ?? []}
        onChange={(value) => onChange('job_title', value)}
      />
      <FilterSelect
        label="Department"
        value={filters.department}
        choices={options?.departments ?? []}
        onChange={(value) => onChange('department', value)}
      />
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  choices: string[]
  onChange: (value: string) => void
}

function FilterSelect({ label, value, choices, onChange }: FilterSelectProps) {
  return (
    <label className="flex flex-col text-sm text-gray-600">
      {label}
      <select
        className="mt-1 rounded border bg-white px-2 py-1 text-gray-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
  )
}
