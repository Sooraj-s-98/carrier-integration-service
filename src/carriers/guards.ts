import { CarrierCode } from "./types"
import { carrierOAuthRegistry } from "./registry"

export function isCarrierCode(
  value: string
): value is CarrierCode {
  return value in carrierOAuthRegistry
}
