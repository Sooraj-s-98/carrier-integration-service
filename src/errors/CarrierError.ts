export type CarrierErrorCode =
  | "CARRIER_TIMEOUT"
  | "CARRIER_UNAVAILABLE"
  | "CARRIER_AUTH_FAILED"
  | "CARRIER_RATE_LIMITED"
  | "CARRIER_BAD_RESPONSE"
  | "CARRIER_HTTP_ERROR"
  | "CARRIER_UNKNOWN_ERROR"

export class CarrierError extends Error {
  constructor(
    public code: CarrierErrorCode,
    public carrier: string,
    public status?: number,
    public details?: unknown
  ) {
    super(code)
  }
}
