import { CarrierCode } from './types'
import { carrierOAuthRegistry } from './registry'

/**
 * Checks if a given string is a valid carrier code.
 *
 * @param {string} value - The string to check.
 * @returns {value is CarrierCode} True if the string is a valid carrier code, false otherwise.
 */
export function isCarrierCode(value: string): value is CarrierCode {
  return value in carrierOAuthRegistry
}
