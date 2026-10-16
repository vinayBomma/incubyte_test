import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const employees = sqliteTable(
  'employees',
  {
    // AUTOINCREMENT so a deleted employee's id is never reused by a new hire.
    id: integer('id').primaryKey({ autoIncrement: true }),
    full_name: text('full_name').notNull(),
    job_title: text('job_title').notNull(),
    department: text('department').notNull(),
    country: text('country').notNull(),
    salary: integer('salary').notNull(),
    currency: text('currency').notNull(),
    hired_on: text('hired_on').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    index('ix_employee_country').on(table.country),
    index('ix_employee_job_title').on(table.job_title),
    index('ix_employee_country_job_title').on(table.country, table.job_title),
  ],
)

export type EmployeeRow = typeof employees.$inferSelect
export type NewEmployeeRow = typeof employees.$inferInsert
