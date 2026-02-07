import { Router, Request, Response, NextFunction } from 'express'
import { carrierOAuthRegistry } from '../carriers/registry'
import { requireAuth } from '../middleware/auth'
import { logger } from '../infra/logger'
import { isCarrierCode } from '../carriers/guards'
import { carrierCallbackSchema } from '../validation/rateSchema'
import { CarrierError } from '../errors/CarrierError'

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
  '/:carrier/connect',
  requireAuth,
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const carrier = req.params.carrier as string

      logger.info('carrier_connect_request', {
        carrier,
        userId: req.user?.userId
      })

      if (!isCarrierCode(carrier)) {
        logger.warn('carrier_connect_unsupported', { carrier })
        return res.status(404).json({
          error: 'Unsupported carrier'
        })
      }

      if (!req.user) {
        logger.warn('carrier_connect_no_user')
        return res.sendStatus(401)
      }

      const provider = carrierOAuthRegistry[carrier]

      const url = provider.getAuthorizeUrl(req.user.userId)

      logger.info('carrier_connect_url_generated', {
        carrier,
        userId: req.user.userId
      })

      return res.json({ url })
    } catch (err) {
      logger.error('carrier_connect_failed', {
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
  '/:carrier/callback',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const raw = {
        carrier: req.params.carrier,
        code: Array.isArray(req.query.code)
          ? req.query.code[0]
          : req.query.code,
        state: Array.isArray(req.query.state)
          ? req.query.state[0]
          : req.query.state
      }

      const parsed = carrierCallbackSchema.safeParse(raw)

      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))

        logger.warn('carrier_callback_validation_failed', {
          raw,
          issues
        })

        return res.status(400).json({
          error: 'invalid_request',
          message: 'Invalid callback parameters',
          details: issues
        })
      }

      const { carrier, code, state } = parsed.data

      logger.info('carrier_callback_received', {
        carrier,
        hasCode: !!code,
        state
      })

      const provider = carrierOAuthRegistry[carrier]

      if (!provider) {
        logger.warn('carrier_callback_unsupported_after_validation', {
          carrier
        })
        return res.status(404).json({
          error: 'unsupported_carrier',
          message: `Carrier '${carrier}' is not supported`
        })
      }

      await provider.handleCallback(code, state)

      logger.info('carrier_connected', {
        carrier,
        userId: state
      })

      return res.send('Connected!')
    } catch (err: any) {
      if (err instanceof CarrierError) {
        logger.error('carrier_callback_failed', {
          err,
          params: req.params,
          query: req.query
        })

        return res.status(err.httpStatus).json(err.toResponse())
      }
      logger.error('carrier_callback_failed', { err })
      next(err)
    }
  }
)

export default router
