# SupplyMind AI — API Reference

Base URLs  
- Backend (dev): `http://localhost:8081`  
- Frontend proxies `/api` and `/auth` to backend via Vite

Root: `GET /` → `{"message":"Hello from the main app!"}`  
Health: `GET /api/v1/health` → `{"status":"healthy","llm_available":true|false,"llm_service":"openai"}`

---

## Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | None | Login with `{email, password}` |
| POST | `/auth/refresh` | None | Refresh access token with `{refresh_token}` |
| POST | `/auth/logout` | `get_current_user` | Logout (placeholder, returns `{message}`) |
| PATCH | `/auth/change-password` | `get_current_user` | Change password with `{current_password, new_password}` |

**POST /auth/login** request:
```json
{ "email": "admin@supplymind.local", "password": "Admin1234!" }
```
**POST /auth/login** response:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "admin@supplymind.local",
    "name": "Admin",
    "role": "admin"
  }
}
```

**POST /auth/refresh** request:
```json
{ "refresh_token": "..." }
```
Response: same as login (new `access_token` + new `refresh_token`).

---

## Auth Admin — `/auth/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/admin/users` | `require_permission(MANAGE_USERS)` | List all users |
| GET | `/auth/admin/users/me` | `get_current_user` | Get current user profile |
| POST | `/auth/admin/users` | `require_permission(MANAGE_USERS)` | Create user with `{name, email, password, role}` |
| PATCH | `/auth/admin/users/{id}` | `require_permission(MANAGE_USERS)` | Update user (body: `UserUpdateRequest`) |
| DELETE | `/auth/admin/users/{id}` | `require_permission(MANAGE_USERS)` | Soft-delete user |

**UserUpdateRequest:**
```json
{ "name": "str?", "role": "str?", "is_active": "bool?" }
```
**UserOut:**
```json
{
  "id": "str",
  "name": "str",
  "email": "str",
  "role": "str",
  "is_active": true,
  "created_at": "datetime",
  "updated_at": "datetime?"
}
```

---

## Forecast — `/api/v1/forecast`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/forecast/predict` | `require_permission(GENERATE_FORECASTS)` | Generate forecast for a product |
| GET | `/api/v1/forecast/kpi` | `require_permission(VIEW_ANALYTICS)` | Get forecast KPI metrics |
| GET | `/api/v1/forecast/hierarchy` | `require_permission(VIEW_ANALYTICS)` | Get product hierarchy |
| GET | `/api/v1/forecast/hierarchy/top-selling` | `require_permission(VIEW_ANALYTICS)` | Get top-selling products |

**POST /forecast/predict** request:
```json
{ "product_id": "str", "horizon_days": 90 }
```

**ForecastPredictResponse:**
```json
{
  "product_id": "str",
  "horizon_days": 90,
  "series": [
    { "date": "2025-01-01", "actual": 100.0, "forecast": 105.0, "lower": 95.0, "upper": 115.0 }
  ],
  "monthly_summary": [
    { "period": "2025-01", "predicted_demand": 3100.0, "confidence_level": 0.85, "demand_trend": "up", "revenue_forecast": 15500.0 }
  ]
}
```

**KPIResponse:**
```json
{
  "forecast_accuracy": 87.5,
  "total_stockout_days": 12,
  "inventory_turnover": 4.2,
  "service_level": 96.0
}
```

---

## Inventory — `/api/v1/inventory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/inventory/products` | `get_current_user` | List products with optional `?category=` filter |
| GET | `/api/v1/inventory` | `get_current_user` | Alias for products list |
| GET | `/api/v1/inventory/stats` | `get_current_user` | Aggregate inventory stats |
| GET | `/api/v1/inventory/reports` | `get_current_user` | List generated report files |
| GET | `/api/v1/inventory/reports/{filename}` | `get_current_user` | Download report file |
| GET | `/api/v1/inventory/risk` | `get_current_user` | Stockout risk assessment |
| GET | `/api/v1/inventory/summary` | `get_current_user` | Inventory summary counts |
| GET | `/api/v1/inventory/turnover` | `get_current_user` | Turnover metrics |
| GET | `/api/v1/inventory/abc` | `get_current_user` | ABC analysis |
| GET | `/api/v1/inventory/xyz` | `get_current_user` | XYZ analysis |
| GET | `/api/v1/inventory/reorder` | `get_current_user` | Reorder recommendations |
| GET | `/api/v1/inventory/stockout-risk` | `get_current_user` | Stockout risk per product |

**InventorySummaryOut:**
```json
{
  "asOf": "2025-03-20",
  "totalProducts": 500,
  "activeProducts": 480,
  "inactiveProducts": 20,
  "totalUnits": 25000,
  "criticalProducts": 5,
  "lowProducts": 25,
  "healthyProducts": 450
}
```

**InventoryRecommendation:**
```json
{
  "sku": "SKU001",
  "name": "Product Name",
  "current_stock": 50,
  "min_stock": 100,
  "max_stock": 500,
  "reorder_point": 120,
  "recommended_order": 70,
  "order_urgency": "high",
  "expected_lead_time_days": 14,
  "notes": ""
}
```

**InventoryItemOut:**
```json
{
  "sku": "str", "name": "str", "category": "str",
  "productType": "", "active": true,
  "stock": 0, "averageDailyDemand": 0.0,
  "coverageDays": null, "coverageLabel": "",
  "stockStatus": "Healthy", "lastUpdated": "",
  "sourceText": ""
}
```

---

## Insights — `/api/v1/insights`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/insights/generate` | `get_current_user` | Generate AI insights for a product |
| POST | `/api/v1/insights/generate/stream` | `get_current_user` | SSE-streamed AI insight generation |
| GET | `/api/v1/insights/monitor/stats` | `get_current_user` | LLM monitor statistics |
| GET | `/api/v1/insights/monitor/history` | `get_current_user` | LLM call history |

**POST /insights/generate** request:
```json
{ "product_id": "str" }
```

**POST /insights/generate/stream** — SSE events:
- `event: status` → `{"step": "..."}`
- `event: token` → `{"token": "..."}`
- `event: result` → final insight object
- `event: done` → `{"status": "complete"}`
- `event: error` → `{"error": "..."}`

---

## Settings — `/api/v1/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/settings` | `get_current_user` | Get user settings |
| PUT | `/api/v1/settings` | `get_current_user` | Save user settings |

**UserSettingsPayload:**
```json
{
  "theme": "dark?",
  "notifications": {},
  "language": "en?",
  "display": {},
  "name": "str?"
}
```

PUT response returns the updated settings dict.

---

## Knowledge — (mounted directly, no prefix)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ingest` | `get_current_user` | Ingest document chunk |
| POST | `/search` | `get_current_user` | Semantic search across knowledge base |
| POST | `/rag-query` | `get_current_user` | RAG query with context retrieval |
| POST | `/copilot/chat` | `get_current_user` | Copilot chat with iteration limits |
| GET | `/status` | `get_current_user` | Knowledge base health status |

`/rag-query` request: `{ "question": "str", "selected_sku": "str?" }`  
`/copilot/chat` request: `{ "message": "str", "context": "str?", "selected_sku": "str?" }`

---

## Command Center — `/api/v1/command-center`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/command-center/morning-brief` | `get_current_user` | Full morning brief |
| GET | `/api/v1/command-center/morning-brief/{category}` | `get_current_user` | Brief by category |
| GET | `/api/v1/command-center/daily-snapshot` | `get_current_user` | Daily snapshot |
| GET | `/api/v1/command-center/overview` | `get_current_user` | Dashboard overview |
| GET | `/api/v1/command-center/health` | `get_current_user` | System health status |
| GET | `/api/v1/command-center/alerts-feed` | `get_current_user` | Active alerts feed |
| GET | `/api/v1/command-center/top-products` | `get_current_user` | Top products list |
| GET | `/api/v1/command-center/insights-feed` | `get_current_user` | Recent insights |
| GET | `/api/v1/command-center/recommendations` | `get_current_user` | Recommendations |
| GET | `/api/v1/command-center/kpi-cards` | `get_current_user` | KPI cards data |
| GET | `/api/v1/command-center/activity-log` | `get_current_user` | Recent activity log |

---

## MLOps — `/api/v1/mlops`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/mlops/metrics` | `get_current_user` | Model performance metrics |
| GET | `/api/v1/mlops/model-card` | `get_current_user` | Model card details |
| GET | `/api/v1/mlops/accuracy` | `get_current_user` | Accuracy over time |
| GET | `/api/v1/mlops/features` | `get_current_user` | Feature list |
| GET | `/api/v1/mlops/data-drift` | `get_current_user` | Data drift analysis |
| GET | `/api/v1/mlops/retrain-log` | `get_current_user` | Retrain history log |
| POST | `/api/v1/mlops/retrain` | `require_permission(GENERATE_FORECASTS)` | Trigger model retrain |
| GET | `/api/v1/mlops/history` | `get_current_user` | Model version history |
| GET | `/api/v1/mlops/online-metrics` | `get_current_user` | Online inference metrics |
| GET | `/api/v1/mlops/feature-importance` | `get_current_user` | Feature importance scores |

---

## System — `/api/v1/system`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/system/alerts` | `get_current_user` | List alerts (`?type=&severity=&acknowledged=`) |
| POST | `/api/v1/system/alerts/acknowledge` | `get_current_user` | Acknowledge alerts `{ids: ["..."]}` |
| POST | `/api/v1/system/alerts/dismiss` | `get_current_user` | Dismiss alerts `{ids: ["..."]}` |
| GET | `/api/v1/system/alerts/{id}` | `get_current_user` | Get single alert |
| GET | `/api/v1/system/reports` | `get_current_user` | List all report types |
| POST | `/api/v1/system/reports/generate` | `get_current_user` | Generate new report |
| GET | `/api/v1/system/reports/{type}` | `get_current_user` | List reports by type |
| GET | `/api/v1/system/reports/{type}/download` | `get_current_user` | Download latest report |
| GET | `/api/v1/system/reports/{type}/download/{filename}` | `get_current_user` | Download by filename |
| GET | `/api/v1/system/reports/{type}/historical` | `get_current_user` | Historical reports |
| DELETE | `/api/v1/system/reports/{type}` | `get_current_user` | Delete report by type |

**AlertItem:**
```json
{
  "id": "str", "type": "str", "severity": "str",
  "title": "str", "description": "str", "product_id": "str",
  "created_at": "datetime",
  "acknowledged": false, "acknowledged_at": null, "acknowledged_by": null
}
```

**ReportItem:**
```json
{
  "id": "str", "title": "str", "description": "str?",
  "type": "str", "format": "str",
  "period_start": "str", "period_end": "str",
  "generated_at": "datetime", "date": "str?",
  "status": "ready", "file_size": null, "download_url": null
}
```

---

## Notifications — `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | `get_current_user` | List notifications (`?unread_only=`) |
| PUT | `/api/v1/notifications/{notification_id}/read` | `get_current_user` | Mark notification as read |

**NotificationItem:**
```json
{
  "id": "str",
  "type": "stockout|low_stock|system|forecast",
  "severity": "critical|high|medium|info",
  "title": "str", "description": "str",
  "product_id": "str?", "created_at": "datetime",
  "read": false, "read_at": null
}
```

---

## Quick Actions — `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/forecast/run` | `require_permission(GENERATE_FORECASTS)` | Run forecast action |
| POST | `/api/v1/inventory/snapshot` | `require_permission(GENERATE_FORECASTS)` | Take inventory snapshot |
| POST | `/api/v1/generate/reports` | `require_permission(GENERATE_INSIGHTS)` | Generate AI reports |

---

## Data — `/api/v1/data`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/data/products` | `get_current_user` | Get products data |

---

## Storage — `/api/v1/storage`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/storage/health` | `get_current_user` | Check storage service health |

Returns:
```json
{
  "status": "healthy|unavailable",
  "storage_available": true|false,
  "message": "..."
}
```

---

## Auth Flow Summary

1. **Login** — `POST /auth/login` with `{email, password}` → receives `access_token` (1hr), `refresh_token` (30d), user object
2. **Store** — Frontend writes to `localStorage` keys: `sm_access_token`, `sm_refresh_token`, `sm_user`
3. **Authenticate** — All non-auth endpoints require `Authorization: Bearer <access_token>` header
4. **Auto-refresh** — `api.ts` fetch wrapper decodes JWT, checks `exp` before call; if expired, calls `POST /auth/refresh` with stored `refresh_token`, retries original request once
5. **Session expiry** — If refresh also fails, redirects to `/login`
6. **Logout** — `POST /auth/logout` + clear `localStorage`

## RBAC Permissions

Defined in `backend/auth/rbac.py`. Permission gating uses `require_permission(Permission.<name>)`:

| Permission | Endpoints |
|---|---|
| `MANAGE_USERS` | `POST/PATCH/DELETE /auth/admin/users` |
| `GENERATE_FORECASTS` | `POST /forecast/predict`, `POST /mlops/retrain`, `POST /forecast/run`, `POST /inventory/snapshot` |
| `VIEW_ANALYTICS` | `GET /forecast/kpi`, `GET /forecast/hierarchy`, `GET /forecast/hierarchy/top-selling` |
| `GENERATE_INSIGHTS` | `POST /generate/reports` |
