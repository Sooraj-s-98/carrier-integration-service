export type Address = {
  city: string
  state: string
  postalCode: string
  countryCode: string
}

export type PackageInput = {
  weight: number
  length: number
  width: number
  height: number
}

export type RateRequest = {
  carrier: string
  shipper: Address
  shipTo: Address
  pkg: PackageInput
  serviceCode?: string
}

export type RateQuote = {
  carrier: string
  serviceCode: string
  serviceName: string
  amount: number
  currency: string
}
