import express from "express"
import { upsRouter } from "./carriers/ups.router"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* -----------------------------
   Global Request Logger
------------------------------*/

app.use((req, _res, next) => {
  console.log(`[SANDBOX] ${req.method} ${req.url}`)
  next()
})

/* -----------------------------
   Carrier Routers
------------------------------*/

app.use("/api/v1/ups", upsRouter)

/* -----------------------------
   Future Carriers
------------------------------*/

// app.use("/api/v1/fedex", fedexRouter)
// app.use("/api/v1/dhl", dhlRouter)

/* -----------------------------
   Start
------------------------------*/

app.listen(4000, () => {
  console.log("🚀 Carrier sandbox running on :4000")
})
