import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { type TestContext, createTestContext } from './helpers'

const ALLOWED = 'https://salary.example.com'
let ctx: TestContext | undefined
afterEach(() => ctx?.close())

function app(corsOrigins: string[] = [ALLOWED]) {
  ctx = createTestContext({ corsOrigins })
  return ctx.app
}

describe('CORS', () => {
  it('test_allowed_origin_receives_cors_header', async () => {
    const res = await request(app()).get('/api/health').set('Origin', ALLOWED)

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED)
  })

  it('test_unknown_origin_receives_no_cors_header', async () => {
    const res = await request(app()).get('/api/health').set('Origin', 'https://evil.example.com')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('test_preflight_for_json_write_is_allowed', async () => {
    const res = await request(app())
      .options('/api/employees/1')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'content-type')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED)
    expect(res.headers['access-control-allow-methods']).toContain('PUT')
  })

  it('test_no_cors_headers_when_no_origins_configured', async () => {
    const res = await request(app([])).get('/api/health').set('Origin', ALLOWED)

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})