import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { type TestContext, createTestContext } from './helpers'

describe('app shell', () => {
  let ctx: TestContext
  afterEach(() => ctx.close())

  it('reports health', async () => {
    ctx = createTestContext()

    const response = await request(ctx.app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('returns a JSON 404 for unknown routes', async () => {
    ctx = createTestContext()

    const response = await request(ctx.app).get('/api/nope')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: { message: 'Not found' } })
  })

  it('does not advertise the framework', async () => {
    ctx = createTestContext()

    const response = await request(ctx.app).get('/api/health')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})
