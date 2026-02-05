import { db } from "./client"

export async function checkDbHealth(): Promise<boolean> {
  try {
    await db.query("SELECT 1")
    return true
  } catch {
    return false
  }
}
