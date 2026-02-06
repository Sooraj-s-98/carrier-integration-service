import { RateRequest, RateQuote } from "../../domain/rate"

export interface RateProvider {
  getRates(
    userId: string,
    req: RateRequest
  ): Promise<RateQuote[]>
}
