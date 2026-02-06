import { Router } from "express"
import { v4 as uuid } from "uuid"

export const upsRouter = Router()

/* -----------------------------
   Fake DB (memory)
------------------------------*/

const refreshStore = new Map<string, string>()

/* -----------------------------
   OAuth Authorize
------------------------------*/

upsRouter.get(
    "/security/v1/oauth/authorize",
    (req, res) => {

        const { redirect_uri, state } = req.query

        console.log("[UPS AUTH] authorize")
        console.log(" redirect_uri:", redirect_uri)
        console.log(" state:", state)

        const code = "fake_auth_code_" + uuid()

        const redirect =
            `${redirect_uri}?code=${code}&state=${state}`

        console.log("[UPS AUTH] redirect →", redirect)

        res.redirect(302, redirect)
    }
)

/* -----------------------------
   OAuth Token
------------------------------*/

upsRouter.post(
    "/security/v1/oauth/token",
    (_req, res) => {

        console.log("[UPS TOKEN] exchange")

        const access = "access_" + uuid()
        const refresh = "refresh_" + uuid()

        refreshStore.set(refresh, access)

        res.json({
            access_token: access,
            refresh_token: refresh,
            expires_in: 3600,
            token_type: "Bearer"
        })
    }
)

/* -----------------------------
   OAuth Refresh
------------------------------*/

upsRouter.post(
    "/security/v1/oauth/refresh",
    (req, res) => {

        const refresh = req.body.refresh_token

        console.log("[UPS REFRESH]", refresh)

        if (!refreshStore.has(refresh)) {
            return res.status(401).json({
                error: "invalid_refresh_token"
            })
        }

        const newAccess = "access_" + uuid()

        refreshStore.set(refresh, newAccess)

        res.json({
            access_token: newAccess,
            refresh_token: refresh,
            expires_in: 3600
        })
    }
)

upsRouter.post(
    "/api/rating/:version/:requestoption",
    (req, res) => {

        console.log("[UPS RATE] version:", req.params.version)
        console.log("[UPS RATE] option:", req.params.requestoption)

        const auth = req.headers.authorization
        if (!auth?.startsWith("Bearer")) {
            return res.status(401).json({
                error: "missing_token"
            })
        }

        const token = auth.split(" ")[1]

        // ✅ validate token exists in fake DB
        const isValid = [...refreshStore.values()].includes(token)

        if (!isValid) {
            console.log("[UPS RATE] invalid token:", token)

            return res.status(401).json({
                error: "invalid_token"
            })
        }

        console.log("[UPS RATE] token valid")

        // realistic UPS-style response
        res.json({
            RateResponse: {
                Response: {
                    ResponseStatus: { Code: "1" }
                },
                RatedShipment: [
                    {
                        Service: {
                            Code: "03",
                            Description: "Ground"
                        },
                        TotalCharges: {
                            CurrencyCode: "USD",
                            MonetaryValue: "12.34"
                        }
                    },
                    {
                        Service: {
                            Code: "02",
                            Description: "2nd Day Air"
                        },
                        TotalCharges: {
                            CurrencyCode: "USD",
                            MonetaryValue: "25.80"
                        }
                    }
                ]
            }
        })
    }
)