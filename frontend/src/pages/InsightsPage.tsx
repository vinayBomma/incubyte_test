import { useId, useState } from 'react'
import { getCountryStats, getJobTitleStats, getOrgSummary } from '../api/client'
import type { CountryStats, JobTitleStats, OrgSummary } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback'
import { StatCard } from '../components/StatCard'
import { useAsync } from '../hooks/useAsync'
import { formatMoney } from '../lib/money'

const formatCount = (n: number) => n.toLocaleString('en-US')

export default function InsightsPage() {
  const [selected, setSelected] = useState<string>()
  const overview = useAsync(() => Promise.all([getOrgSummary(), getCountryStats()]), [])

  if (overview.loading) return <Loading label="Loading insights…" />
  if (overview.error) return <ErrorMessage error={overview.error} onRetry={overview.reload} />
  if (!overview.data) return null
  const [summary, countries] = overview.data
  const current = countries.find((c) => c.country === selected) ?? countries[0]

  return (
    <div className="space-y-8">
      <OrgSummarySection summary={summary} />
      {current ? (
        <>
          <CountryInsights countries={countries} stats={current} onSelect={setSelected} />
          <CountryComparison countries={countries} onSelect={setSelected} />
        </>
      ) : (
        <EmptyState>No salary data yet. Add employees to see insights.</EmptyState>
      )}
    </div>
  )
}

function OrgSummarySection({ summary }: { summary: OrgSummary }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-xl font-semibold">
        Organisation
      </h2>
      <dl className="grid grid-cols-3 gap-4">
        <StatCard label="Employees" value={formatCount(summary.headcount)} />
        <StatCard label="Countries" value={formatCount(summary.country_count)} />
        <StatCard label="Departments" value={formatCount(summary.department_count)} />
      </dl>
    </section>
  )
}

interface CountryInsightsProps {
  countries: CountryStats[]
  stats: CountryStats
  onSelect: (country: string) => void
}

function CountryInsights({ countries, stats, onSelect }: CountryInsightsProps) {
  const headingId = useId()
  const selectId = useId()
  const money = (minor: number) => formatMoney(minor, stats.currency)

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 id={headingId} className="text-xl font-semibold">
          Salaries in {stats.country} <span className="text-base font-normal text-gray-500">({stats.currency})</span>
        </h2>
        <div className="flex flex-col text-sm text-gray-600">
          <label htmlFor={selectId}>Country</label>
          <select
            id={selectId}
            className="mt-1 rounded border bg-white px-2 py-1 text-gray-900"
            value={stats.country}
            onChange={(event) => onSelect(event.target.value)}
          >
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country}
              </option>
            ))}
          </select>
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-4">
        <StatCard label="Headcount" value={formatCount(stats.headcount)} />
        <StatCard label="Minimum" value={money(stats.min_salary)} />
        <StatCard label="Average" value={money(stats.avg_salary)} />
        <StatCard label="Maximum" value={money(stats.max_salary)} />
      </dl>
      <h3 className="pt-2 font-medium">Average salary by job title</h3>
      <JobTitleTable country={stats.country} currency={stats.currency} />
    </section>
  )
}

function JobTitleTable({ country, currency }: { country: string; currency: string }) {
  const jobTitles = useAsync(() => getJobTitleStats(country), [country])

  if (jobTitles.loading) return <Loading label="Loading job titles…" />
  if (jobTitles.error) return <ErrorMessage error={jobTitles.error} onRetry={jobTitles.reload} />
  if (!jobTitles.data || jobTitles.data.length === 0) {
    return <EmptyState>No employees in {country} yet.</EmptyState>
  }
  const highest = Math.max(...jobTitles.data.map((row) => row.avg_salary))

  return (
    <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
      <thead className="border-b text-gray-600">
        <tr>
          <th>Job title</th>
          <th className="text-right">Headcount</th>
          <th className="text-right">Average salary</th>
          <th className="w-1/3">
            <span className="sr-only">Relative to highest average</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {jobTitles.data.map((row: JobTitleStats) => (
          <tr key={row.job_title} className="border-b last:border-0">
            <td className="font-medium">{row.job_title}</td>
            <td className="text-right tabular-nums">{formatCount(row.headcount)}</td>
            <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(row.avg_salary, currency)}</td>
            <td aria-hidden="true">
              <div className="h-2 rounded bg-gray-800" style={{ width: `${(row.avg_salary / highest) * 100}%` }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
interface CountryComparisonProps {
  countries: CountryStats[]
  onSelect: (country: string) => void
}

function CountryComparison({ countries, onSelect }: CountryComparisonProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-xl font-semibold">
          All countries
        </h2>
        <p className="text-sm text-gray-500">
          Amounts are in each country&apos;s local currency and are not converted, so compare within a row, not
          across rows.
        </p>
      </div>
      <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
        <thead className="border-b text-gray-600">
          <tr>
            <th>Country</th>
            <th className="text-right">Headcount</th>
            <th className="text-right">Minimum</th>
            <th className="text-right">Average</th>
            <th className="text-right">Maximum</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.country} className="border-b last:border-0">
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(c.country)}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {c.country}
                </button>
              </td>
              <td className="text-right tabular-nums">{formatCount(c.headcount)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(c.min_salary, c.currency)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(c.avg_salary, c.currency)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(c.max_salary, c.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}