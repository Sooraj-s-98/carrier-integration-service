# Carrier Integration Service

A production-style **Carrier Integration Service** built with **Node.js, Express, TypeScript, PostgreSQL** that integrates with shipping carriers (UPS now, extensible for FedEx/USPS/DHL later).

Supports:

- User login/register
- Multi-carrier connection per user
- UPS OAuth2 (Auth Code flow)
- UPS Rating API (rate shopping)
- Token storage + refresh lifecycle
- Structured error handling
- Zod validation
- Stubbed carrier sandbox server
- CLI demo client

Designed with clean separation so new carriers can be added without modifying existing ones.

---

# Tech Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Zod validation
- Axios
- Winston logger
- JWT auth
- PM2 process manager

---

# Project Structure

```
src/
  carriers/
    base/
    ups/
    registry.ts
  routes/
  services/
  db/
  errors/
  middleware/
  cli/
carrier-sandbox/
```

---

# Clone Project

```bash
git clone https://github.com/Sooraj-s-98/carrier-integration-service.git
cd carrier-integration-service
npm install
```

---

# Environment Setup

Copy example env file:

```bash
cp .env.example .env
```

Update values:

```env
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/database

JWT_SECRET=super_long_random_secret

UPS_CLIENT_ID=
UPS_CLIENT_SECRET=
UPS_REDIRECT_URI=http://localhost:3000/api/v1/carriers/ups/callback
UPS_BASE_URL=http://localhost:4000/api/v1/ups
```

---

# Carrier Sandbox (Stub UPS Server)

This project includes a stub UPS server for OAuth + Rating so no real UPS credentials are required.

Start sandbox:

```bash
cd carrier-sandbox
npm install
npx ts-node src/server.ts
```

Sandbox runs at:

```
http://localhost:4000
```

Provides stub endpoints:

- OAuth authorize
- OAuth token
- OAuth refresh
- Rating API

---

# Database Setup

Create database manually first:

```bash
createdb cybership
```

Run init script:

```bash
npm run db:init --db=cybership
```


---

# Build Project

```bash
npm run build
```

---

# Start Service with PM2

```bash
npm run pm2:start
```

PM2 config runs compiled build from `/dist`.

Check:

```bash
pm2 list
pm2 logs
```

---

# API Flow

## 1️⃣ Register

```
POST /api/v1/auth/register
```

## 2️⃣ Login

```
POST /api/v1/auth/login
```

Returns JWT token.

---

## 3️⃣ Connect UPS

```
GET /api/v1/carriers/ups/connect
Authorization: Bearer <token>
```

Returns authorize URL → open in browser.

---

## 4️⃣ OAuth Callback

UPS redirects to:

```
/api/v1/carriers/ups/callback
```

Tokens stored per user.

---

## 5️⃣ Rate Shopping

```
POST /api/v1/rates
Authorization: Bearer <token>
```

Normalized response returned — caller never sees raw UPS format.

---

# Error Handling

Structured carrier errors:

```
CARRIER_TIMEOUT
CARRIER_UNAVAILABLE
CARRIER_AUTH_FAILED
CARRIER_RATE_LIMITED
CARRIER_BAD_RESPONSE
CARRIER_HTTP_ERROR
```

Mapped to proper HTTP status:

| Code | HTTP |
|------|------|
TIMEOUT | 504 |
UNAVAILABLE | 503 |
RATE_LIMITED | 429 |
AUTH_FAILED | 401 |
BAD_RESPONSE | 502 |

User-safe messages returned.

---

# Validation

All inputs validated using **Zod**:

- Auth routes
- Carrier callback
- Rate request payloads

Invalid input returns structured error response.

---

# Integration Testing Strategy

External carrier calls are **stubbed** using sandbox server.

Tests verify:

- Request payload mapping
- Response normalization
- Token lifecycle
- Refresh logic
- Error handling
- Timeout handling

No real UPS keys required.

---

# CLI Demo

Simple CLI demonstrates:

- register
- login
- connect carrier
- rate request

Run CLI with port:

```bash
npm run cli --port=3000
```

---

## UPS OAuth — Authorization Code Flow

Implementation follows UPS OAuth2 Authorization Code grant flow:

- Authorization redirect
- Code exchange
- Access token + refresh token
- Token refresh lifecycle
- Per-user carrier account linking

Official reference:

https://developer.ups.com/api/reference/oauth/authorization-code?loc=en_US

Covered in this project:

- Authorize URL generation
- Callback handling
- Token exchange
- Token refresh
- Token expiry handling
- Secure token storage per user

---

## UPS Rating API

Rate shopping implementation is based on UPS Rating API documentation.

Features implemented:

- Shop rates request
- Payload mapping from internal domain model
- Response normalization
- Carrier-agnostic rate quote output
- Stubbed API responses for integration tests
- Structured error handling

Official reference:

https://developer.ups.com/tag/Rating?loc=en_US#section/Reference

---


---

# Author

Sooraj S  
Software Engineer —
