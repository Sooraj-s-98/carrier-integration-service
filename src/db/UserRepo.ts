import { db } from "./client"

export type UserRow = {
  id: string
  username: string
  password_hash: string
}

export class UserRepo {

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
