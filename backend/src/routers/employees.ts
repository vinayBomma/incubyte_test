import { Router } from 'express'
import { NotFoundError } from '../errors'
import type { EmployeeService } from '../services/employees'

/** Ids are positive integers; anything else cannot name an employee, so it is a 404. */
function parseId(raw: string): number {
  const id = /^\d+$/.test(raw) ? Number(raw) : 0
  if (!Number.isSafeInteger(id) || id < 1) throw new NotFoundError(`Employee ${raw} not found`)
  return id
}

export function employeesRouter(service: EmployeeService): Router {
  return Router()
    .post('/employees', (req, res) => {
      res.status(201).json(service.create(req.body))
    })
    .get('/employees/:id', (req, res) => {
      res.json(service.get(parseId(req.params.id)))
    })
    .put('/employees/:id', (req, res) => {
      res.json(service.update(parseId(req.params.id), req.body))
    })
    .delete('/employees/:id', (req, res) => {
      service.delete(parseId(req.params.id))
      res.status(204).end()
    })
}