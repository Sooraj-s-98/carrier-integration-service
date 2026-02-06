import axios from "axios"
import { OAuthProvider } from "../base/OAuthProvider"
import { env } from "../../config/env"
import { db } from "../../db/client"
import { logger } from "../../infra/logger"

type CarrierAccountRow = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: Date
}

export class UpsOAuthProvider implements OAuthProvider {

  /* ---------------------------
     Authorize URL
  ----------------------------*/

  getAuthorizeUrl(state: string): string {
    return `${env.upsBase}/security/v1/oauth/authorize` +
      `?client_id=${env.upsClientId}` +
      `&redirect_uri=${env.upsRedirectUri}` +
      `&response_type=code` +
      `&state=${state}`
  }

  /* ---------------------------
     OAuth Callback Handler
  ----------------------------*/

  async handleCallback(
    code: string,
    userId: string
  ): Promise<void> {

    const token = await axios.post(
      `${env.upsBase}/security/v1/oauth/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.upsRedirectUri
      }),
      {
        headers: this.basicAuthHeader()
      }
    )

    const t = token.data

    await db.query(`
      INSERT INTO user_carrier_accounts
      (id,user_id,carrier_code,access_token,refresh_token,token_expires_at)
      VALUES (gen_random_uuid(),$1,'ups',$2,$3,now()+$4*interval '1 sec')
      ON CONFLICT (user_id, carrier_code)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at
    `, [
      userId,
      t.access_token,
      t.refresh_token,
      t.expires_in
    ])

    logger.info("ups_token_saved", { userId })
  }

  /* ---------------------------
     Get Valid Token (auto refresh)
  ----------------------------*/

  async getValidAccessToken(
    userId: string
  ): Promise<string> {

    const r = await db.query<CarrierAccountRow>(`
      SELECT id, access_token, refresh_token, token_expires_at
      FROM user_carrier_accounts
      WHERE user_id=$1 AND carrier_code='ups'
    `, [userId])

    const acc = r.rows[0]

    if (!acc) {
      throw new Error("UPS not connected")
    }

    const now = Date.now()
    const exp = new Date(acc.token_expires_at).getTime()

    // refresh if expires in < 2 minutes
    if (exp - now > 120_000) {
      return acc.access_token
    }

    return this.refreshToken(acc)
  }

  /* ---------------------------
     Refresh Token
  ----------------------------*/

  private async refreshToken(
    acc: CarrierAccountRow
  ): Promise<string> {

    const resp = await axios.post(
      `${env.upsBase}/security/v1/oauth/refresh`,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: acc.refresh_token
      }),
      {
        headers: this.basicAuthHeader()
      }
    )

    const t = resp.data

    await db.query(`
      UPDATE user_carrier_accounts
      SET access_token=$1,
          refresh_token=$2,
          token_expires_at=now()+$3*interval '1 sec'
      WHERE id=$4
    `, [
      t.access_token,
      t.refresh_token,
      t.expires_in,
      acc.id
    ])

    logger.info("ups_token_refreshed", { accountId: acc.id })

    return t.access_token
  }

  /* ---------------------------
     Helpers
  ----------------------------*/

  private basicAuthHeader() {
    return {
      Authorization:
        "Basic " +
        Buffer.from(
          `${env.upsClientId}:${env.upsSecret}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }
}
