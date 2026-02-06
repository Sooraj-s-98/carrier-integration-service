import axios from "axios"
import { RateProvider } from "../base/RateProvider"
import { RateRequest, RateQuote } from "../../domain/rate"
import { UpsOAuthProvider } from "./UpsOAuthProvider"
import { env } from "../../config/env"
import { logger } from "../../infra/logger"
import { CarrierError } from "../../errors/CarrierError"

export class UpsRateProvider implements RateProvider {

  private auth = new UpsOAuthProvider()

  /**
   * Gets shipping rates from UPS for the given rate request.
   * @param {string} userId - The ID of the user to get the rates for.
   * @param {RateRequest} req - The rate request to get rates for.
   * @returns {Promise<RateQuote[]>} The rates for the given rate request.
   * @throws {CarrierError} If the user is not connected to UPS or if the request fails.
   */
  async getRates(
    userId: string,
    req: RateRequest
  ): Promise<RateQuote[]> {
  
    logger.info("UPS rate request started", { userId })
  
    const body = this.buildUpsRequest(req)
  
    const token =
      await this.auth.getValidAccessToken(userId)
  
    try {
  
      return await this.callUps(
        token,
        body,
        userId
      )
  
    } catch (err) {
  
      /* -------------------------
         Retry once on auth failure
      --------------------------*/
  
      if (
        err instanceof CarrierError &&
        err.code === "CARRIER_AUTH_FAILED"
      ) {
        logger.warn(
          "UPS auth failed — refreshing token",
          { userId }
        )
  
        const fresh =
          await this.auth.getValidAccessToken(userId)
  
        return this.callUps(
          fresh,
          body,
          userId
        )
      }

  
      if (err instanceof CarrierError) {
        throw err
      }
  
  
      throw this.mapAxiosError(err)
    }
  }
  

  /**
   * Makes a call to the UPS rate API with the given token and body.
   * @param {string} token - The valid access token for the UPS API.
   * @param {any} body - The request body to send to the UPS rate API.
   * @param {string} userId - The ID of the user to whom the rates belong.
   * @returns {Promise<RateQuote[]>} The rates returned by the UPS API.
   * @throws {CarrierError} If the UPS API returns an error or a malformed response.
   */
  private async callUps(
    token: string,
    body: any,
    userId: string
  ): Promise<RateQuote[]> {

    logger.info("Calling UPS rate API", { userId })

    try {

      const resp = await axios.post(
        `${env.upsBase}/api/rating/v2409/Shop`,
        body,
        {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${token}`,
            transId: "rate_" + Date.now(),
            transactionSrc: "carrier-service"
          }
        }
      )

      if (!resp.data?.RateResponse) {
        throw new CarrierError(
          "CARRIER_BAD_RESPONSE",
          "ups",
          resp.status,
          resp.data
        )
      }

      return this.normalize(resp.data)

    } catch (err: any) {

      /* -------------------------
         Auth failure (401)
      --------------------------*/

      if (err.response?.status === 401) {

        logger.warn("UPS returned 401", { userId })

        throw new CarrierError(
          "CARRIER_AUTH_FAILED",
          "ups",
          401,
          err.response.data
        )
      }

      /* -------------------------
         Rate limited
      --------------------------*/

      if (err.response?.status === 429) {
        throw new CarrierError(
          "CARRIER_RATE_LIMITED",
          "ups",
          429,
          err.response.data
        )
      }

      /* -------------------------
         Other HTTP errors
      --------------------------*/

      if (err.response) {
        throw new CarrierError(
          "CARRIER_HTTP_ERROR",
          "ups",
          err.response.status,
          err.response.data
        )
      }

      /* -------------------------
         Network errors
      --------------------------*/

      if (err.code === "ECONNABORTED") {
        throw new CarrierError(
          "CARRIER_TIMEOUT",
          "ups"
        )
      }

      if (err.code === "ECONNREFUSED") {
        throw new CarrierError(
          "CARRIER_UNAVAILABLE",
          "ups"
        )
      }

      /* -------------------------
         Unknown
      --------------------------*/

      throw new CarrierError(
        "CARRIER_UNKNOWN_ERROR",
        "ups",
        undefined,
        err
      )
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

    if (err.code === "ECONNREFUSED") {
      return new CarrierError(
        "CARRIER_UNAVAILABLE",
        "ups"
      )
    }

    if (err.code === "ECONNABORTED") {
      return new CarrierError(
        "CARRIER_TIMEOUT",
        "ups"
      )
    }

    if (err.response) {
      return new CarrierError(
        "CARRIER_HTTP_ERROR",
        "ups",
        err.response.status,
        err.response.data
      )
    }

    return new CarrierError(
      "CARRIER_UNKNOWN_ERROR",
      "ups"
    )
  }



  /**
   * Builds a UPS rate request payload from a RateRequest object
   * @param {RateRequest} r - The RateRequest object to build from
   * @returns {object} The built UPS rate request payload
   */
  private buildUpsRequest(r: RateRequest) {

    logger.info("Building UPS rate payload", {
      shipperCity: r.shipper.city,
      shipToCity: r.shipTo.city
    })

    return {
      RateRequest: {
        Shipment: {
          Shipper: {
            Address: {
              City: r.shipper.city,
              StateProvinceCode: r.shipper.state,
              PostalCode: r.shipper.postalCode,
              CountryCode: r.shipper.countryCode
            }
          },
          ShipTo: {
            Address: {
              City: r.shipTo.city,
              StateProvinceCode: r.shipTo.state,
              PostalCode: r.shipTo.postalCode,
              CountryCode: r.shipTo.countryCode
            }
          },
          Package: {
            Dimensions: {
              Length: r.pkg.length,
              Width: r.pkg.width,
              Height: r.pkg.height
            },
            PackageWeight: {
              Weight: r.pkg.weight
            }
          }
        }
      }
    }
  }

  /**
   * Normalize a UPS rate response to a standard RateQuote array
   * @param {any} data - The UPS rate response to normalize
   * @returns {RateQuote[]} The normalized RateQuote array
   */
  private normalize(data: any): RateQuote[] {

    logger.info("Normalizing UPS rate response")

    if (!data?.RateResponse?.RatedShipment) {
      throw new CarrierError(
        "CARRIER_BAD_RESPONSE",
        "ups",
        undefined,
        data
      )
    }

    const listRaw = data.RateResponse.RatedShipment

    const list = Array.isArray(listRaw)
      ? listRaw
      : [listRaw]

    return list.map((s: any) => ({
      carrier: "ups",
      serviceCode: s.Service.Code,
      serviceName: s.Service.Description,
      amount: Number(
        s.TotalCharges.MonetaryValue
      ),
      currency: s.TotalCharges.CurrencyCode
    }))
  }
}
