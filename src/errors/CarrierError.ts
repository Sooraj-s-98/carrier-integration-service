/* ----------------------------------
   Error Codes
-----------------------------------*/

export type CarrierErrorCode =
  | 'CARRIER_TIMEOUT'
  | 'CARRIER_UNAVAILABLE'
  | 'CARRIER_AUTH_FAILED'
  | 'CARRIER_RATE_LIMITED'
  | 'CARRIER_BAD_RESPONSE'
  | 'CARRIER_HTTP_ERROR'
  | 'CARRIER_UNKNOWN_ERROR'

/* ----------------------------------
   Carrier Error
-----------------------------------*/

export class CarrierError extends Error {
  public readonly httpStatus: number

  constructor(
    public code: CarrierErrorCode,
    public carrier: string,
    status?: number,
    public details?: unknown
  ) {
    super(code)

    this.name = 'CarrierError'

    // if explicit status passed → use it
    // else derive from code
    this.httpStatus = status ?? defaultStatus(code)

    // fix prototype chain (important for instanceof)
    Object.setPrototypeOf(this, CarrierError.prototype)
  }

  /* ----------------------------------
     Safe payload for API response
  -----------------------------------*/

  toResponse() {
    return {
      error: this.code,
      carrier: this.carrier,
      message: userMessage(this.code)
    }
  }
}

/* ----------------------------------
   Status Mapping
-----------------------------------*/

function defaultStatus(code: CarrierErrorCode): number {
  switch (code) {
    case 'CARRIER_TIMEOUT':
      return 504

    case 'CARRIER_UNAVAILABLE':
      return 503

    case 'CARRIER_RATE_LIMITED':
      return 429

    case 'CARRIER_AUTH_FAILED':
      return 401

    case 'CARRIER_BAD_RESPONSE':
    case 'CARRIER_HTTP_ERROR':
      return 502

    default:
      return 502
  }
}

/* ----------------------------------
   User Messages (safe)
-----------------------------------*/

function userMessage(code: CarrierErrorCode): string {
  switch (code) {
    case 'CARRIER_TIMEOUT':
      return 'Carrier request timed out'

    case 'CARRIER_UNAVAILABLE':
      return 'Carrier service unavailable'

    case 'CARRIER_RATE_LIMITED':
      return 'Carrier rate limit exceeded'

    case 'CARRIER_AUTH_FAILED':
      return 'Carrier authentication failed'

    case 'CARRIER_BAD_RESPONSE':
      return 'Carrier returned invalid response'

    default:
      return 'Carrier request failed'
  }
}
