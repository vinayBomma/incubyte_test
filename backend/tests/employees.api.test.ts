import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { employeePayload } from './factories'
import { TODAY, type TestContext, createTestContext } from './helpers'

let ctx: TestContext
beforeEach(() => {
  ctx = createTestContext()
})
afterEach(() => ctx.close())

function post(body: unknown) {
  return request(ctx.app).post('/api/employees').send(body as object)
}

function errorFields(body: { error: { fields?: Record<string, string> } }): string[] {
  return Object.keys(body.error.fields ?? {})
}

describe('POST /api/employees', () => {
  it('test_create_employee_returns_201_with_stored_employee', async () => {
    const res = await post(employeePayload())

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject(employeePayload())
    expect(Number.isInteger(res.body.id)).toBe(true)
    expect(res.body.created_at).toMatch(/Z$/)
    expect(res.body.updated_at).toBe(res.body.created_at)
  })

  it.each<[string, unknown]>([
    ['full_name', undefined],
    ['full_name', '   '],
    ['full_name', 'x'.repeat(201)],
    ['job_title', ''],
    ['job_title', 'x'.repeat(101)],
    ['department', ''],
    ['salary', 0],
    ['salary', -1],
    ['salary', 10 ** 12 + 1],
    ['salary', 1000.5],
    ['salary', '1000'],
    ['currency', 'inr'],
    ['currency', 'RUPEE'],
    ['hired_on', '1949-12-31'],
    ['hired_on', 'not-a-date'],
    ['hired_on', '2025-02-30'],
  ])('test_create_employee_rejects_invalid_%s (%j)', async (field, value) => {
    const res = await post(employeePayload({ [field]: value }))

    expect(res.status).toBe(422)
    expect(errorFields(res.body)).toEqual([field])
  })

  it('test_create_employee_rejects_unsupported_country', async () => {
    const res = await post(employeePayload({ country: 'Atlantis' }))

    expect(res.status).toBe(422)
    expect(res.body.error.fields).toEqual({ country: 'Select a country' })
  })

  it('test_create_employee_rejects_currency_not_matching_country', async () => {
    const res = await post(employeePayload({ country: 'India', currency: 'USD' }))

    expect(res.status).toBe(422)
    expect(res.body.error.fields).toEqual({ currency: 'Currency for India must be INR' })
  })

  it('test_create_employee_rejects_hire_date_after_injected_today', async () => {
    const res = await post(employeePayload({ hired_on: '2025-07-01' }))

    expect(res.status).toBe(422)
    expect(res.body.error.fields).toEqual({ hired_on: 'Cannot be in the future' })
  })

  it('test_create_employee_accepts_hire_date_equal_to_today', async () => {
    const res = await post(employeePayload({ hired_on: TODAY }))

    expect(res.status).toBe(201)
  })

  it('test_create_employee_trims_text_fields', async () => {
    const res = await post(
      employeePayload({ full_name: '  Asha Rao ', job_title: ' SWE ', department: ' Eng ' }),
    )

    expect([res.body.full_name, res.body.job_title, res.body.department]).toEqual([
      'Asha Rao',
      'SWE',
      'Eng',
    ])
  })

  it('test_create_employee_returns_400_for_malformed_json', async () => {
    const res = await request(ctx.app)
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send('{"full_name": ')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { message: 'Malformed JSON body' } })
  })

  it('test_create_employee_returns_generic_500_when_database_fails', async () => {
    const logged: unknown[] = []
    const broken = createTestContext({ logError: (error) => logged.push(error) })
    broken.close()

    const res = await request(broken.app).post('/api/employees').send(employeePayload())

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: { message: 'Internal server error' } })
    expect(logged).toHaveLength(1)
  })
})

describe('GET /api/employees/:id', () => {
  it('test_get_employee_returns_employee', async () => {
    const created = (await post(employeePayload())).body

    const res = await request(ctx.app).get(`/api/employees/${created.id}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(created)
  })

  it('test_get_employee_returns_404_when_missing', async () => {
    const res = await request(ctx.app).get('/api/employees/999')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { message: 'Employee 999 not found' } })
  })

  it.each(['abc', '0', '-1', '1.5'])('test_get_employee_returns_404_for_invalid_id_%s', async (id) => {
    const res = await request(ctx.app).get(`/api/employees/${id}`)

    expect(res.status).toBe(404)
  })
})
async function createEmployee(overrides: Record<string, unknown> = {}) {
  const res = await post(employeePayload(overrides))
  expect(res.status).toBe(201)
  return res.body
}

describe('PUT /api/employees/:id', () => {
  it('test_update_employee_replaces_fields', async () => {
    const created = await createEmployee()
    const changes = employeePayload({
      full_name: 'Asha R. Menon',
      job_title: 'Staff Engineer',
      country: 'Germany',
      currency: 'EUR',
      salary: 9_500_000,
    })

    const res = await request(ctx.app).put(`/api/employees/${created.id}`).send(changes)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ...changes, id: created.id, created_at: created.created_at })
    expect((await request(ctx.app).get(`/api/employees/${created.id}`)).body).toEqual(res.body)
  })

  it('test_update_employee_bumps_updated_at', async () => {
    let tick = 0
    const timed = createTestContext({ now: () => `2025-06-30T10:00:0${tick++}.000Z` })
    const created = (await request(timed.app).post('/api/employees').send(employeePayload())).body

    const res = await request(timed.app).put(`/api/employees/${created.id}`).send(employeePayload())

    expect(res.body.created_at).toBe('2025-06-30T10:00:00.000Z')
    expect(res.body.updated_at).toBe('2025-06-30T10:00:01.000Z')
    timed.close()
  })

  it('test_update_employee_returns_404_when_missing', async () => {
    const res = await request(ctx.app).put('/api/employees/999').send(employeePayload())

    expect(res.status).toBe(404)
  })

  it('test_update_employee_rejects_invalid_change_and_keeps_record', async () => {
    const created = await createEmployee()

    const res = await request(ctx.app)
      .put(`/api/employees/${created.id}`)
      .send(employeePayload({ currency: 'USD' }))

    expect(res.status).toBe(422)
    expect(errorFields(res.body)).toEqual(['currency'])
    expect((await request(ctx.app).get(`/api/employees/${created.id}`)).body).toEqual(created)
  })
})

describe('DELETE /api/employees/:id', () => {
  it('test_delete_employee_returns_204_and_removes_it', async () => {
    const created = await createEmployee()

    const res = await request(ctx.app).delete(`/api/employees/${created.id}`)

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect((await request(ctx.app).get(`/api/employees/${created.id}`)).status).toBe(404)
  })

  it('test_delete_employee_returns_404_when_missing', async () => {
    const res = await request(ctx.app).delete('/api/employees/999')

    expect(res.status).toBe(404)
  })

  it('test_delete_employee_does_not_reuse_id_for_next_create', async () => {
    const first = await createEmployee()
    await request(ctx.app).delete(`/api/employees/${first.id}`)

    const second = await createEmployee()

    expect(second.id).toBeGreaterThan(first.id)
  })
})