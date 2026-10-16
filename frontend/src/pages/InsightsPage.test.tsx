import { render, screen, within } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/client'
import { COUNTRY_STATS, JOB_TITLE_STATS, ORG_SUMMARY } from '../test/fixtures'
import InsightsPage from './InsightsPage'

const userEvent = userEventLib.setup({ delay: null })

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return { ...actual, getOrgSummary: vi.fn(), getCountryStats: vi.fn(), getJobTitleStats: vi.fn() }
})

const getOrgSummary = vi.mocked(api.getOrgSummary)
const getCountryStats = vi.mocked(api.getCountryStats)
const getJobTitleStats = vi.mocked(api.getJobTitleStats)

function cardValue(container: HTMLElement, label: string) {
  return within(container).getByText(label, { selector: 'dt' }).nextElementSibling
}

beforeEach(() => {
  getOrgSummary.mockResolvedValue(ORG_SUMMARY)
  getCountryStats.mockResolvedValue(COUNTRY_STATS)
  getJobTitleStats.mockImplementation(async (country) => JOB_TITLE_STATS[country] ?? [])
})

describe('InsightsPage', () => {
  it('shows a loading state, then the org summary', async () => {
    render(<InsightsPage />)

    expect(screen.getByText(/loading insights/i)).toBeInTheDocument()
    const summary = await screen.findByRole('region', { name: /organisation/i })
    expect(cardValue(summary, 'Employees')).toHaveTextContent('10,000')
    expect(cardValue(summary, 'Countries')).toHaveTextContent('2')
    expect(cardValue(summary, 'Departments')).toHaveTextContent('9')
  })

  it('shows salary stats and job title averages for the first country by default', async () => {
    render(<InsightsPage />)

    const section = await screen.findByRole('region', { name: /salaries in india/i })
    expect(screen.getByLabelText(/country/i)).toHaveValue('India')
    expect(cardValue(section, 'Headcount')).toHaveTextContent('3,000')
    expect(cardValue(section, 'Minimum')).toHaveTextContent('₹500,000')
    expect(cardValue(section, 'Average')).toHaveTextContent('₹2,100,000')
    expect(cardValue(section, 'Maximum')).toHaveTextContent('₹6,000,000')

    const row = await within(section).findByRole('row', { name: /staff engineer/i })
    expect(row).toHaveTextContent('40')
    expect(row).toHaveTextContent('₹4,500,000')
    expect(getJobTitleStats).toHaveBeenCalledWith('India')
  })

  it('switches country', async () => {
    render(<InsightsPage />)

    await userEvent.selectOptions(await screen.findByLabelText(/country/i), 'Japan')

    const section = screen.getByRole('region', { name: /salaries in japan/i })
    expect(cardValue(section, 'Average')).toHaveTextContent('¥8,500,000')
    expect(await within(section).findByRole('row', { name: /data analyst/i })).toHaveTextContent('¥7,000,000')
    expect(within(section).queryByRole('row', { name: /staff engineer/i })).not.toBeInTheDocument()
  })

  it('shows an error with retry when the overview fails', async () => {
    getOrgSummary.mockRejectedValueOnce(new api.ApiError(500, 'Database unavailable'))
    render(<InsightsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByRole('region', { name: /organisation/i })).toBeInTheDocument()
  })

  it('keeps the page usable when job titles fail, with a retry', async () => {
    getJobTitleStats.mockRejectedValueOnce(new api.ApiError(500, 'Timed out'))
    render(<InsightsPage />)

    const section = await screen.findByRole('region', { name: /salaries in india/i })
    expect(await within(section).findByRole('alert')).toHaveTextContent('Timed out')
    expect(cardValue(section, 'Headcount')).toHaveTextContent('3,000')

    await userEvent.click(within(section).getByRole('button', { name: /retry/i }))
    expect(await within(section).findByRole('row', { name: /staff engineer/i })).toBeInTheDocument()
  })

  it('shows an empty state when there is no salary data yet', async () => {
    getOrgSummary.mockResolvedValue({ headcount: 0, country_count: 0, department_count: 0 })
    getCountryStats.mockResolvedValue([])
    render(<InsightsPage />)

    expect(await screen.findByText(/no salary data yet/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/country/i)).not.toBeInTheDocument()
  })

  it('shows an empty state when a country has no job title data', async () => {
    getJobTitleStats.mockResolvedValue([])
    render(<InsightsPage />)

    expect(await screen.findByText(/no employees in india yet/i)).toBeInTheDocument()
  })

  it('compares all countries in local currency and selects one on click', async () => {
    render(<InsightsPage />)

    const table = await screen.findByRole('region', { name: /all countries/i })
    const japan = within(table).getByRole('row', { name: /japan/i })
    expect(japan).toHaveTextContent('500')
    expect(japan).toHaveTextContent('¥4,000,000')
    expect(japan).toHaveTextContent('¥8,500,000')
    expect(japan).toHaveTextContent('¥20,000,000')
    expect(within(table).getByRole('row', { name: /india/i })).toHaveTextContent('₹2,100,000')

    await userEvent.click(within(japan).getByRole('button', { name: 'Japan' }))

    expect(screen.getByRole('region', { name: /salaries in japan/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/country/i)).toHaveValue('Japan')
  })
})
