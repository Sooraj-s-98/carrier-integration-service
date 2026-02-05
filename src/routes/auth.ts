import { Router, Request, Response, NextFunction } from "express"
import { AuthService } from "../services/AuthService"
import { registerSchema, loginSchema } from "../validation/authSchemas"
import { logger } from "../infra/logger"

const authRoutes = Router()
const svc = new AuthService()

authRoutes.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = registerSchema.parse(req.body)

      await svc.register(
        body.username,
        body.password
      )

      return res.status(201).json({
        ok: true
      })

    } catch (err) {
      logger.error("register_failed", { err })
      return res.status(400).json({
        ok: false
      })
    }
  }
)

authRoutes.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body)

      const token = await svc.login(
        body.username,
        body.password
      )

      return res.json({ token })

    } catch (err) {
      logger.warn("login_failed", { err })
      next(err)
    }
  }
)

export default authRoutes;
