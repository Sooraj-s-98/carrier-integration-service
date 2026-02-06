import { db } from "./client"

export type UserRow = {
  id: string
  username: string
  password_hash: string
}

export class UserRepo {

  /**
   * Create a new user.
   *
   * @param id The user's ID.
   * @param username The user's username.
   * @param hash The user's password hash.
   */
  async create(
    id: string,
    username: string,
    hash: string
  ): Promise<void> {

    await db.query(
      `INSERT INTO users(id, username, password_hash)
       VALUES ($1,$2,$3)`,
      [id, username, hash]
    )
  }

  /**
   * Find a user by their username.
   * @param {string} username The username to search for.
   * @returns {Promise<UserRow | null>} The user row if found, null otherwise.
   */
  async findByUsername(
    username: string
  ): Promise<UserRow | null> {

    const r = await db.query<UserRow>(
      `SELECT id, username, password_hash
       FROM users
       WHERE username=$1`,
      [username]
    )

    return r.rows[0] ?? null
  }
}
