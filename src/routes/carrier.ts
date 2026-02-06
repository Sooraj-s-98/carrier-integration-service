import { Router, Request, Response, NextFunction } from "express"
import { carrierOAuthRegistry } from "../carriers/registry"
import { requireAuth } from "../middleware/auth"
import { logger } from "../infra/logger"
import { isCarrierCode } from "../carriers/guards"

const router = Router()

/* -----------------------------
   Types
------------------------------*/

type AuthedRequest = Request & {
  user?: {
    userId: string
  }
}

/* -----------------------------
   CONNECT — Get OAuth URL
------------------------------*/

router.get(
  "/:carrier/connect",
  requireAuth,
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const carrier = req.params.carrier as string

      logger.info("carrier_connect_request", {
        carrier,
        userId: req.user?.userId
      })

      if (!isCarrierCode(carrier)) {
        logger.warn("carrier_connect_unsupported", { carrier })
        return res.status(404).json({
          error: "Unsupported carrier"
        })
      }

      if (!req.user) {
        logger.warn("carrier_connect_no_user")
        return res.sendStatus(401)
      }

      const provider = carrierOAuthRegistry[carrier]

      const url = provider.getAuthorizeUrl(req.user.userId)

      logger.info("carrier_connect_url_generated", {
        carrier,
        userId: req.user.userId
      })

      return res.json({ url })

    } catch (err) {
      logger.error("carrier_connect_failed", {
        err,
        carrier: req.params.carrier
      })
      next(err)
    }
  }
)

/* -----------------------------
   CALLBACK — OAuth redirect
------------------------------*/

router.get(
  "/:carrier/callback",
  async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const carrier = req.params.carrier as string
      const { code, state } = req.query

      logger.info("carrier_callback_received", {
        carrier,
        hasCode: !!code,
        state
      })

      if (!isCarrierCode(carrier)) {
        logger.warn("carrier_callback_unsupported", {
          carrier
        })
        return res.status(404).json({
          error: "Unsupported carrier"
        })
      }

      if (!code || !state) {
        logger.warn("carrier_callback_missing_params", {
          carrier,
          codePresent: !!code,
          statePresent: !!state
        })
        return res.status(400).json({
          error: "Missing code or state"
        })
      }

      const provider = carrierOAuthRegistry[carrier]

      await provider.handleCallback(
        code as string,
        state as string
      )

      logger.info("carrier_connected", {
        carrier,
        userId: state
      })

      return res.send("Connected!")

    } catch (err) {
      logger.error("carrier_callback_failed", {
        err,
        carrier: req.params.carrier,
        query: req.query
      })
      next(err)
    }
  }
)

export default router
