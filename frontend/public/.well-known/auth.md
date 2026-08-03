# SupplyMind AI — Authentication Guide for Agents

- **API base URL:** `https://api.supplymind.tech`
- **Public site:** `https://supplymind.tech`
- **Auth model:** Self-hosted JWT (HS256) with short-lived access tokens and opaque refresh tokens.

## Overview

SupplyMind uses a custom JWT flow (not OAuth 2.0 / OpenID Connect). There is **no
client-secret or client registration**. A user obtains an access token by logging in
with email + password. Access tokens expire after **15 minutes**; refresh tokens after
**7 days**.

## 1. Login — obtain tokens

`POST https://api.supplymind.tech/auth/login`

Request:
```json
{
  "email": "user@supplymind.tech",
  "password": "your-password"
}
```

Success `200`:
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque>",
  "token_type": "bearer",
  "expires_in": 900
}
```

Errors:
- `401` invalid credentials
- `423` account temporarily locked (see `locked_until` in the response body)
- `429` too many login attempts (rate limit)

## 2. Authenticate requests

Send the access token on every protected request:

```
Authorization: Bearer <access_token>
```

## 3. Refresh — keep the session alive

`POST https://api.supplymind.tech/auth/refresh`

Request:
```json
{ "refresh_token": "<opaque refresh token>" }
```

Returns a new `access_token` / `refresh_token` pair.

## 4. Logout — revoke the refresh token

`POST https://api.supplymind.tech/auth/logout` with `{ "refresh_token": "..." }`.

## 5. Change password

`POST https://api.supplymind.tech/auth/change-password` (authenticated) with
`{ "current_password": "...", "new_password": "..." }`.

## Roles & scopes

Roles are resolved from the JWT at the API layer (hierarchy: `viewer < analyst < manager < admin`):

| Role | Example abilities |
| --- | --- |
| `viewer` | Read dashboards, KPIs, inventory views |
| `analyst` | `+` run forecasts, AI insights |
| `manager` | `+` reports, purchase orders |
| `admin` | `+` user/role administration (`/auth/admin/*`), MLOps |

Protected endpoints under `/api/v1/*` require the Bearer token. User/role administration
lives under `/auth/admin/*` and requires `admin`.

## Discovery documents

- Agent card: `https://supplymind.tech/.well-known/agent-card.json`
- API catalog: `https://supplymind.tech/.well-known/api-catalog`
- OAuth/OpenID discovery: `/.well-known/oauth-authorization-server`,
  `/.well-known/oauth-protected-resource`, `/.well-known/openid-configuration`
- Authorized audience: JWT `aud` / domain check enforces `supplymind.tech`.
