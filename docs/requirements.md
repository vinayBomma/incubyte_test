# Requirements: ACME Salary Management

## Goal
Replace the HR team's Excel files with a web app where the HR Manager can maintain salary data for ~10,000 employees across countries and answer basic questions about how the org pays people.

Stack (fixed for a Node.js role): Node + Express + TypeScript, Drizzle ORM on SQLite, zod, Vitest + Supertest; React + Vite + TypeScript, Tailwind, Vitest + React Testing Library.

## Success criteria
- HR can find any employee within 2 clicks of the landing page (search box on the employee list).
- Employee list API responds in < 300 ms (p95, local) for a filtered/searched page against 10,000 rows.
- Insights API responds in < 500 ms (p95, local) against 10,000 rows.
- Seed script creates 10,000 employees in < 10 s and gives identical data on every run.
- Invalid input (missing fields, salary ≤ 0, currency that doesn't match the country) is rejected with a clear, field-level message.
- Backend and frontend test suites each run in < 30 s with no network access.

## Persona
**HR Manager, ACME.** Comfortable with Excel and not technical. Needs to look up and correct individual records quickly, and to answer questions from leadership such as "what do we pay engineers in India?"

## In scope

**1. Employee management**
- *As an HR Manager, I can browse employees in a paginated list.* The page size is 25 by default. Paging and filtering happen on the server. The list shows the total count. The API also supports sorting by an allowed set of columns.
- *I can search by name.* Search is case-insensitive and partial ("ann" matches "Joanna"). It combines with the filters below.
- *I can filter by country, job title and department.* Filters can be combined, the options come from existing data, and they can be cleared.
- *I can add and edit an employee.* The form validates required fields, salary > 0, a supported country, and a currency that matches that country. After saving, the list shows the change.
- *I can delete an employee.* A confirmation dialog appears first. Deletion is permanent.

**2. Salary insights** (all figures are in each country's local currency)
- *I can see min, max and average salary plus headcount for each country.* One row per country with its currency.
- *I can see the average salary per job title within a selected country.* Each row shows the job title, headcount and average salary.
- *I can see an org summary.* It shows total headcount, the number of countries and the number of departments. No cross-currency salary totals are shown.

**3. Seed data**
- *As a developer, I can seed 10,000 realistic employees with one command.* A fixed random seed makes the data deterministic. Salary ranges are realistic for each country and job title. Rows are bulk-inserted in one transaction, and running the script again resets the data.

**4. UI**
- Plain Tailwind CSS with native HTML controls (`<table>`, `<select>`, `<input>`) and a small custom modal (`role="dialog"`). No component library (Mantine was considered and dropped), so tests in jsdom need no polyfills. Native `<dialog>` isn't used because jsdom doesn't implement `showModal()`.

## Deliberately out of scope
| Item | Reason |
|---|---|
| Authentication / roles | There is one persona with seeded fake data. Auth adds a lot of work and shows little about the core problem. |
| Currency conversion | Picking FX rates and dates is a product decision of its own. Comparing within a country avoids misleading numbers. |
| Payroll / tax | This is a different domain (payslips, deductions, compliance). The goal is managing salary data, not running payroll. |
| Excel import | Mapping and validating messy spreadsheets is a project in itself. It is the most likely next feature. |
| Audit / salary history | Edits overwrite the current value. History matters in production but can be added later without breaking changes. |
| Natural-language querying | The structured insights cover the questions listed. Natural-language querying would be costly to make reliable and testable. |

## Assumptions
- "Salary" means annual gross base pay. Bonus, equity and benefits are excluded.
- Salary is stored in the employee's local currency (ISO 4217 code) as an integer in minor units (e.g. cents), never a float.
- Each country uses a single currency, taken from a fixed list of supported countries.
- Employee fields: full name, job title, department, country, salary, currency, hire date. There is no email or other unique business key, so duplicate names are allowed.
- Gender and other sensitive attributes are not stored.
- One HR user at a time. If two edits collide, the last write wins.
- The API and the SPA are deployed separately (API with SQLite on one host, static SPA on another), connected by an env-configured URL and CORS.
