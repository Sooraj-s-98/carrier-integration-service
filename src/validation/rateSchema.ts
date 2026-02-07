import { z } from 'zod'
import { isCarrierCode } from '../carriers/guards'

/* ---------------------------
   Address
----------------------------*/

export const addressSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(3),
  countryCode: z.string().length(2)
})

/* ---------------------------
   Package
----------------------------*/

export const packageSchema = z.object({
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive()
})

/* ---------------------------
   Rate Request
----------------------------*/

export const rateRequestSchema = z.object({
  carrier: z.enum(['ups']),

  shipper: addressSchema,

  shipTo: addressSchema,

  pkg: packageSchema,

  serviceCode: z.string().optional()
})

/* ---------------------------
   Type Inference
----------------------------*/

export type RateRequestInput = z.infer<typeof rateRequestSchema>

export const carrierCallbackSchema = z.object({
  carrier: z.string().refine(isCarrierCode, { message: 'Unsupported carrier' }),
  code: z.string().min(1, { message: 'code is required' }),
  state: z.string().uuid({
    message: 'state must be a valid userId UUID'
  })
})

export type CarrierCallbackInput = z.infer<typeof carrierCallbackSchema>
