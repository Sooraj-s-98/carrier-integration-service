import express from "express"
import { v4 as uuid } from "uuid"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* -----------------------------
   Request Logger Middleware
------------------------------*/
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`)
  next()
})

/* -----------------------------
   Fake DB (memory)
------------------------------*/
const refreshStore = new Map()

/* -----------------------------
   OAuth Authorize
------------------------------*/
app.get("/api/v1/ups/security/v1/oauth/authorize", (req, res) => {

  const { redirect_uri, state } = req.query

  console.log("[AUTH] Authorize called")
  console.log(" redirect_uri:", redirect_uri)
  console.log(" state:", state)

  const code = "fake_auth_code_" + uuid()

  const redirect =
    `${redirect_uri}?code=${code}&state=${state}`

  console.log("[AUTH] Redirecting with code:", code)

  res.redirect(302, redirect)
})

/* -----------------------------
   OAuth Token
------------------------------*/
app.post("/api/v1/ups/security/v1/oauth/token", (_req, res) => {

  console.log("[TOKEN] Token endpoint hit")

  const access = "access_" + uuid()
  const refresh = "refresh_" + uuid()

  refreshStore.set(refresh, access)

  console.log("[TOKEN] Generated tokens")
  console.log(" access:", access)
  console.log(" refresh:", refresh)

  res.json({
    access_token: access,
    refresh_token: refresh,
    expires_in: 3600,
    token_type: "Bearer"
  })
})

/* -----------------------------
   OAuth Refresh
------------------------------*/
app.post("/api/v1/ups/security/v1/oauth/refresh", (req, res) => {

  const refresh = req.body.refresh_token

  console.log("[REFRESH] Refresh attempt:", refresh)

  if (!refreshStore.has(refresh)) {
    console.log("[REFRESH] Invalid refresh token")
    return res.status(401).json({
      error: "invalid_refresh_token"
    })
  }

  const newAccess = "access_" + uuid()
  refreshStore.set(refresh, newAccess)

  console.log("[REFRESH] New access issued:", newAccess)

  res.json({
    access_token: newAccess,
    refresh_token: refresh,
    expires_in: 3600
  })
})

/* -----------------------------
   Start
------------------------------*/
app.listen(4000, () => {
  console.log("🚀 Carrier sandbox running on http://localhost:4000")
})
