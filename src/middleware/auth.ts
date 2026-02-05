import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

type AuthedRequest = Request & {
  user?: {
    userId: string
  }
}
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) return res.sendStatus(401)

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string }

    req.user = payload
    next()

  } catch {
    return res.sendStatus(401)
  }
}
