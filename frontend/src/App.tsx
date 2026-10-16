import { useState } from 'react'
import EmployeesPage from './pages/EmployeesPage'
import InsightsPage from './pages/InsightsPage'

type View = 'employees' | 'insights'

const VIEWS: { id: View; label: string }[] = [
  { id: 'employees', label: 'Employees' },
  { id: 'insights', label: 'Insights' },
]

export default function App() {
  const [view, setView] = useState<View>('employees')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
          <h1 className="text-lg font-semibold">ACME Salary Management</h1>
          <nav className="flex gap-1">
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-current={view === id ? 'page' : undefined}
                onClick={() => setView(id)}
                className="rounded px-3 py-1 text-sm aria-[current=page]:bg-gray-900 aria-[current=page]:text-white"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {view === 'employees' ? <EmployeesPage /> : <InsightsPage />}
      </main>
    </div>
  )
}
