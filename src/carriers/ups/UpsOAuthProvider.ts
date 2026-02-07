import axios from 'axios'
import { OAuthProvider } from '../base/OAuthProvider'
import { env } from '../../config/env'
import { db } from '../../db/client'
import { logger } from '../../infra/logger'
import { CarrierError } from '../../errors/CarrierError'

type CarrierAccountRow = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: Date
}

export class UpsOAuthProvider implements OAuthProvider {
  /**
   * Generate an authorize URL for the UPS OAuth flow
   * @param {string} state - The state parameter for the OAuth flow
   * @returns {string} The authorize URL
   */
  getAuthorizeUrl(state: string): string {
    return (
      `${env.upsBase}/security/v1/oauth/authorize` +
      `?client_id=${env.upsClientId}` +
      `&redirect_uri=${env.upsRedirectUri}` +
      `&response_type=code` +
      `&state=${state}`
    )
  }

  /**
   * Handles the OAuth callback for UPS
   * @param {string} code - The authorization code from the OAuth flow
   * @param {string} userId - The ID of the user to whom the token belongs
   * @returns {Promise<void>} A promise which resolves when the token is saved
   * @throws {CarrierError} If the token exchange fails or the token is invalid
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const token = await axios.post(
        `${env.upsBase}/security/v1/oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.upsRedirectUri
        }),
        {
          headers: this.basicAuthHeader(),
          timeout: 8000
        }
      )

      const t = token.data

      if (!t?.access_token) {
        throw new CarrierError('CARRIER_BAD_RESPONSE', 'ups', 502, t)
      }

      await db.query(
        `
        INSERT INTO user_carrier_accounts
        (id,user_id,carrier_code,access_token,refresh_token,token_expires_at)
        VALUES (gen_random_uuid(),$1,'ups',$2,$3,now()+$4*interval '1 sec')
        ON CONFLICT (user_id, carrier_code)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at
      `,
        [userId, t.access_token, t.refresh_token, t.expires_in]
      )

      logger.info('ups_token_saved', { userId })
    } catch (err: any) {
      logger.error('ups_oauth_exchange_failed', {
        error: err?.response?.data || err.message
      })

      throw this.mapAxiosError(err)
    }
  }

  /* ---------------------------
     Get Valid Token (auto refresh)
  ----------------------------*/

  /**
   * Gets a valid access token for the given user, auto-refreshing if necessary.
   * @param {string} userId - The ID of the user to get the token for.
   * @returns {Promise<string>} The valid access token.
   * @throws {Error} If the user is not connected to UPS.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const r = await db.query<CarrierAccountRow>(
      `
      SELECT id, access_token, refresh_token, token_expires_at
      FROM user_carrier_accounts
      WHERE user_id=$1 AND carrier_code='ups'
    `,
      [userId]
    )

    const acc = r.rows[0]

    if (!acc) {
      throw new CarrierError(
        'CARRIER_AUTH_FAILED',
        'ups',
        401,
        'UPS account not connected'
      )
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

  /**
   * Refreshes the access token for the given user's UPS account.
   * @param {CarrierAccountRow} acc - The row from the user_carrier_accounts table
   * @returns {Promise<string>} The refreshed access token
   * @throws {Error} If the refresh token request fails
   */ private async refreshToken(acc: CarrierAccountRow): Promise<string> {
    try {
      const resp = await axios.post(
        `${env.upsBase}/security/v1/oauth/refresh`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: acc.refresh_token
        }),
        {
          headers: this.basicAuthHeader(),
          timeout: 8000
        }
      )

      const t = resp.data

      if (!t?.access_token) {
        throw new CarrierError('CARRIER_BAD_RESPONSE', 'ups', 502, t)
      }

      await db.query(
        `
      UPDATE user_carrier_accounts
      SET access_token=$1,
          refresh_token=$2,
          token_expires_at=now()+$3*interval '1 sec'
      WHERE id=$4
    `,
        [t.access_token, t.refresh_token, t.expires_in, acc.id]
      )

      logger.info('ups_token_refreshed', {
        accountId: acc.id
      })

      return t.access_token
    } catch (err: any) {
      logger.error('ups_token_refresh_failed', {
        error: err?.response?.data || err.message
      })

      throw this.mapAxiosError(err)
    }
  }

  /**
   * Generates a basic authorization header for the UPS API
   * @returns {object} A headers object with the "Authorization" and "Content-Type" headers set.
   * @private
   */
  private basicAuthHeader() {
    return {
      Authorization:
        'Basic ' +
        Buffer.from(`${env.upsClientId}:${env.upsSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }

  /**
   * Maps an Axios error to a CarrierError.
   * If the error is an Axios error response, it will be mapped to a CarrierError with the HTTP status code and response data.
   * If the error is an ECONNREFUSED error, it will be mapped to a CarrierError with the code "CARRIER_UNAVAILABLE".
   * If the error is an ECONNABORTED error, it will be mapped to a CarrierError with the code "CARRIER_TIMEOUT".
   * If the error is none of the above, it will be mapped to a CarrierError with the code "CARRIER_UNKNOWN_ERROR".
   * @param {any} err - The error to map.
   * @returns {CarrierError} The mapped CarrierError.
   */
  private mapAxiosError(err: any): CarrierError {
    if (err.code === 'ECONNABORTED') {
      return new CarrierError('CARRIER_TIMEOUT', 'ups')
    }

    if (err.code === 'ECONNREFUSED') {
      return new CarrierError('CARRIER_UNAVAILABLE', 'ups')
    }

    if (err.response) {
      const status = err.response.status

      if (status === 401) {
        return new CarrierError('CARRIER_AUTH_FAILED', 'ups', 401)
      }

      if (status === 429) {
        return new CarrierError('CARRIER_RATE_LIMITED', 'ups', 429)
      }

      return new CarrierError(
        'CARRIER_HTTP_ERROR',
        'ups',
        status,
        err.response.data
      )
    }

    return new CarrierError('CARRIER_UNKNOWN_ERROR', 'ups')
  }
}
