import dotenv from 'dotenv'
dotenv.config()

export const env = {
  port: Number(process.env.PORT || 3000),
  dbUrl: process.env.DATABASE_URL!,
  upsClientId: process.env.UPS_CLIENT_ID!,
  upsSecret: process.env.UPS_CLIENT_SECRET!,
  upsRedirectUri: process.env.UPS_REDIRECT_URI!,
  upsBase: process.env.UPS_BASE_URL!
}
