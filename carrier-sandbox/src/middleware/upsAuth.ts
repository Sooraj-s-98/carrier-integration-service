/**
 * Require basic authentication for a given request.
 * This middleware checks if the Authorization header is present and starts with "Basic ".
 * If not, it returns a 401 response with the error "missing_basic_auth".
 * If the Authorization header is present, it decodes the base64 string and checks if the client ID and secret match the environment variables.
 * If not, it returns a 401 response with the error "invalid_client_credentials".
 * If the Authorization header is malformed, it returns a 401 response with the error "invalid_basic_auth_format".
 */
// mock data
const UPS_CLIENT_ID = ["mock_client_id"]
const UPS_CLIENT_SECRET = ["mock_secret"]

export function requireBasicAuth(
    req: any,
    res: any,
    next: any
) {
    const header = req.headers.authorization

    if (!header || !header.startsWith("Basic ")) {
        return res.status(401).json({
            error: "missing_basic_auth"
        })
    }

    try {
        const base64 = header.split(" ")[1]
        const decoded = Buffer
            .from(base64, "base64")
            .toString("utf8")

        const [clientId, secret] = decoded.split(":")
        if (
            !UPS_CLIENT_ID.includes(clientId) ||
            !UPS_CLIENT_SECRET.includes(secret)
        ) {
            return res.status(401).json({
                error: "invalid_client_credentials"
            })
        }

        next()

    } catch {
        return res.status(401).json({
            error: "invalid_basic_auth_format"
        })
    }
}
