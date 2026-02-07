import { Router, Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'
import { registerSchema, loginSchema } from '../validation/authSchemas'
import { logger } from '../infra/logger'

const authRoutes = Router()
const svc = new AuthService()

authRoutes.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = registerSchema.parse(req.body)

      await svc.register(body.username, body.password)

      return res.status(201).json({
        ok: true
      })
    } catch (err: any) {
      logger.error('register_failed', { err })
      return res.status(400).json({
        ok: false,
        message: err.message || 'Registration failed'
      })
    }
  }
)

authRoutes.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body)

      const token = await svc.login(body.username, body.password)

      return res.json({ token })
    } catch (err: any) {
      logger.warn('login_failed', { err })

      if (err.message === 'Username or password is incorrect') {
        return res.status(401).json({
          error: 'invalid_credentials',
          message: err.message
        })
      }

      return res.status(400).json({
        error: 'login_failed',
        message: err.message || 'Login failed'
      })
    }
  }
)

export default authRoutes
