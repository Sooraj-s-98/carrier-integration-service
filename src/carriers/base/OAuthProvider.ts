export interface OAuthProvider {
  getAuthorizeUrl(state: string): string

  handleCallback(code: string, userId: string): Promise<void>

  getValidAccessToken(userId: string): Promise<string>
}
