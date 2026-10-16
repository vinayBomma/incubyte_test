import type { EmployeeInput } from '@acme/shared'
import { eq } from 'drizzle-orm'
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