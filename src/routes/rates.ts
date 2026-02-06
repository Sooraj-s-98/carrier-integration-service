import { Router } from "express"
import { requireAuth } from "../middleware/auth"
import { rateRegistry } from "../carriers/rateRegistry"
import { rateRequestSchema } from "../validation/rateSchema"
import { logger } from "../infra/logger"
import { CarrierError } from "../errors/CarrierError"


const r = Router()



r.post("/", requireAuth, async (req: any, res, next) => {
  try {

    /* -------------------------
       Validate Input
    --------------------------*/

    const parsed =
      rateRequestSchema.safeParse(req.body)

    if (!parsed.success) {

      logger.warn("rate_validation_failed", {
        issues: parsed.error.issues
      })

      return res.status(400).json({
        error: "invalid_request",
        details: parsed.error.issues
      })
    }

    const input = parsed.data

    /* -------------------------
       Carrier Provider
    --------------------------*/

    const provider =
      rateRegistry[input.carrier]

    if (!provider) {
      return res.status(400).json({
        error: "unsupported_carrier"
      })
    }

    /* -------------------------
       Call Provider
    --------------------------*/

    const quotes = await provider.getRates(
      req.user.userId,
      input
    )

    logger.info("rate_success", {
      carrier: input.carrier,
      count: quotes.length
    })

    res.json({ quotes })

  } catch (err) {
    if (err instanceof CarrierError) {

      logger.warn("carrier_error", {
        code: err.code,
        carrier: err.carrier,
        details: err.details
      })

      return res
        .status(err.httpStatus)
        .json(err.toResponse())
    }
    logger.error("rate_failed", { err })
    next(err)
  }
})

export default r
