import { render, screen } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from './api/client'
import App from './App'
import { COUNTRY_STATS, JOB_TITLE_STATS, OPTIONS, ORG_SUMMARY, makePage } from './test/fixtures'

const userEvent = userEventLib.setup({ delay: null })

vi.mock('./api/client')

beforeEach(() => {
  vi.mocked(api.listEmployees).mockResolvedValue(makePage([]))
  vi.mocked(api.getOptions).mockResolvedValue(OPTIONS)
  vi.mocked(api.getOrgSummary).mockResolvedValue(ORG_SUMMARY)
  vi.mocked(api.getCountryStats).mockResolvedValue(COUNTRY_STATS)
  vi.mocked(api.getJobTitleStats).mockResolvedValue(JOB_TITLE_STATS.India)
})

it('switches between the employees and insights pages', async () => {
  render(<App />)
  expect(screen.getByRole('button', { name: 'Employees' })).toHaveAttribute('aria-current', 'page')
  expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Insights' }))

  expect(await screen.findByRole('region', { name: /organisation/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Insights' })).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('heading', { name: 'Employees' })).not.toBeInTheDocument()
})
