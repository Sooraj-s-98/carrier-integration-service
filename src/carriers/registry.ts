import { OAuthProvider } from "./base/OAuthProvider"
import { UpsOAuthProvider } from "./ups/UpsOAuthProvider"
import { CarrierCode } from "./types"

export const carrierOAuthRegistry: Record<CarrierCode, OAuthProvider> = {
  ups: new UpsOAuthProvider()
}