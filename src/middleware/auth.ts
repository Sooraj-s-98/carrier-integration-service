import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

type AuthedRequest = Request & {
  user?: {
    userId: string
  }
}
/**
 * Middleware to verify the authentication token sent in the Authorization header.
 * If the token is valid, it sets the req.user property to the user ID payload.
 * If the token is invalid or missing, it returns a 401 Unauthorized response.
 */
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
