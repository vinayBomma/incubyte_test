import type { EmployeeInput, EmployeeQuery, SortField } from '@acme/shared'
import { type SQL, and, asc, count, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { type EmployeeRow, employees } from '../db/schema'

export function insertEmployee(db: Db, input: EmployeeInput, now: string): EmployeeRow {
  return db
    .insert(employees)
    .values({ ...input, created_at: now, updated_at: now })
    .returning()
    .get()
}

export function findEmployee(db: Db, id: number): EmployeeRow | undefined {
  return db.select().from(employees).where(eq(employees.id, id)).get()
}
export function updateEmployee(
  db: Db,
  id: number,
  input: EmployeeInput,
  now: string,
): EmployeeRow | undefined {
  return db
    .update(employees)
    .set({ ...input, updated_at: now })
    .where(eq(employees.id, id))
    .returning()
    .get()
}

/** Returns whether a row was deleted. */
export function deleteEmployee(db: Db, id: number): boolean {
  return db.delete(employees).where(eq(employees.id, id)).run().changes > 0
}
/** Allowlist: the only columns a client can sort by. User input never reaches SQL as an identifier. */
const SORT_COLUMNS = {
  full_name: employees.full_name,
  salary: employees.salary,
  hired_on: employees.hired_on,
  country: employees.country,
  job_title: employees.job_title,
} satisfies Record<SortField, unknown>

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function listFilter(query: EmployeeQuery): SQL | undefined {
  return and(
    query.search
      ? sql`${employees.full_name} LIKE ${`%${escapeLike(query.search)}%`} ESCAPE '\\'`
      : undefined,
    query.country ? eq(employees.country, query.country) : undefined,
    query.job_title ? eq(employees.job_title, query.job_title) : undefined,
    query.department ? eq(employees.department, query.department) : undefined,
  )
}

export function listEmployees(db: Db, query: EmployeeQuery): { items: EmployeeRow[]; total: number } {
  const where = listFilter(query)
  const direction = query.order === 'desc' ? desc : asc
  const items = db
    .select()
    .from(employees)
    .where(where)
    .orderBy(direction(SORT_COLUMNS[query.sort]), asc(employees.id))
    .limit(query.page_size)
    .offset((query.page - 1) * query.page_size)
    .all()
  const total = db.select({ total: count() }).from(employees).where(where).get()?.total ?? 0
  return { items, total }
}

function distinctValues(db: Db, column: typeof employees.job_title | typeof employees.department): string[] {
  return db
    .selectDistinct({ value: column })
    .from(employees)
    .orderBy(column)
    .all()
    .map((row) => row.value)
}

export function distinctJobTitles(db: Db): string[] {
  return distinctValues(db, employees.job_title)
}

export function distinctDepartments(db: Db): string[] {
  return distinctValues(db, employees.department)
}