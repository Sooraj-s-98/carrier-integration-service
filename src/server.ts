import { app } from "./app"
import { env } from "./config/env"
import { logger } from "./infra/logger"

app.listen(env.port, () => {
  logger.info(`server_started port=${env.port}`)
})
