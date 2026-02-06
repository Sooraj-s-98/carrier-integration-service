import { db } from "./client"

/**
 * Checks if the database is healthy by attempting to execute a simple query.
 * @returns {Promise<boolean>} true if the database is healthy, false otherwise.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await db.query("SELECT 1")
    return true
  } catch {
    return false
  }
}
