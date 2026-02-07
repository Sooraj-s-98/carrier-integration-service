import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { UserRepo } from '../db/UserRepo'
import { logger } from '../infra/logger'

export class AuthService {
  private repo = new UserRepo()

  async register(username: string, password: string): Promise<void> {
    const existing = await this.repo.findByUsername(username)

    if (existing) {
      logger.warn('register_username_exists', { username })
      throw new Error('Username already exists')
    }

    const hash = await bcrypt.hash(password, 12)

    await this.repo.create(uuid(), username, hash)

    logger.info('user_registered', { username })
  }

  async login(username: string, password: string): Promise<string> {
    const user = await this.repo.findByUsername(username)

    if (!user) {
      logger.warn('login_user_not_found', { username })
      throw new Error('Username or password is incorrect')
    }

    const ok = await bcrypt.compare(password, user.password_hash)

    if (!ok) {
      logger.warn('login_bad_password', { username })
      throw new Error('Username or password is incorrect')
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!)

    logger.info('login_success', {
      userId: user.id,
      username
    })

    return token
  }
}
