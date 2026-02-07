import { UpsRateProvider } from './ups/UpsRateProvider'
import { RateProvider } from './base/RateProvider'

export const rateRegistry: Record<string, RateProvider> = {
  ups: new UpsRateProvider()
}
