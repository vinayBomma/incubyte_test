import { Router } from 'express'

export function healthRouter(): Router {
  return Router().get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
}
