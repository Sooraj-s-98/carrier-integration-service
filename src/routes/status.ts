import { Router } from "express"
import { serviceInfo } from "../config/service"
import { checkDbHealth } from "../db/health"
import { logger } from "../infra/logger"

const router = Router()

router.get("/status", async (_req, res) => {
  const dbUp = await checkDbHealth()

  const payload = {
    status: dbUp ? "ok" : "degraded",
    service: serviceInfo.name,
    version: serviceInfo.version,
    time: new Date().toISOString(),
    db: dbUp ? "up" : "down"
  }

  logger.info("status_check", payload)

  res.status(dbUp ? 200 : 503).json(payload)
})

export default router
