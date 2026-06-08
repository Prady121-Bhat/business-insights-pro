# Business Insights Pro

**AI-Powered Business Analytics, Forecasting, and Decision Intelligence Platform**

Enterprise SaaS built for companies that need to understand their data — revenue trends, customer behavior, inventory health, and future forecasts — without a dedicated data team.

---

## Features

| Category | Capabilities |
|---|---|
| **Dashboard** | KPI cards, revenue/profit/expense trends, real-time overviews |
| **Customer Analytics** | RFM segmentation, CLV calculation, churn risk, cohort analysis |
| **Inventory Intelligence** | Velocity tracking, stockout prediction, reorder recommendations, dead inventory detection |
| **Revenue Forecasting** | Linear regression, moving average, exponential smoothing, ensemble ML models |
| **AI Insights** | Auto-generated business recommendations triggered by anomalies |
| **Reports** | PDF, Excel, CSV export for revenue, customers, inventory, forecasts |
| **Data Import** | CSV/Excel upload with column mapping, validation, error preview |
| **Notifications** | In-app + email alerts for low stock, revenue drops, churn risk |
| **Multi-Tenant** | Company isolation — each tenant's data is fully segregated |
| **RBAC** | Six roles: Super Admin, Company Admin, Manager, Analyst, Employee, Viewer |

---

## Tech Stack

```
Frontend    React 18 + Vite + TypeScript + MUI + React Query + Recharts
Backend     Node.js + Express + TypeScript + MongoDB + Mongoose
Analytics   Python 3.11 + FastAPI + scikit-learn + Pandas + NumPy
Reports     PDFKit + ExcelJS
Proxy       Nginx
Deploy      Docker + Docker Compose
```

---

## Quick Start (Docker)

### Prerequisites

- Docker 24+
- Docker Compose v2

### 1. Clone and configure

```bash
git clone https://github.com/yourorg/business-insights-pro.git
cd business-insights-pro

# Copy and fill in secrets
cp backend/.env.example backend/.env
cp analytics-service/.env.example analytics-service/.env
```

**Minimum required in `backend/.env`:**

```env
MONGO_URI=mongodb://admin:changeme@mongo:27017/business_insights_pro?authSource=admin
JWT_ACCESS_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<64+ random chars>
ANALYTICS_SERVICE_KEY=<match analytics .env INTERNAL_API_KEY>
CLIENT_URL=http://localhost
```

**`analytics-service/.env`:**

```env
INTERNAL_API_KEY=<match backend ANALYTICS_SERVICE_KEY>
```

### 2. Build and start

```bash
docker compose up --build -d
```

App is available at **http://localhost**

API health check: **http://localhost/health**

### 3. Stop

```bash
docker compose down
# To also remove volumes (data):
docker compose down -v
```

---

## Development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env   # fill in MONGO_URI and JWT secrets
npm install
npm run dev            # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Analytics Service

```bash
cd analytics-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python main.py             # http://localhost:8001
```

### Development with Docker

```bash
docker compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Analytics: http://localhost:8001

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | 64+ char secret for access tokens |
| `JWT_REFRESH_SECRET` | ✅ | 64+ char secret for refresh tokens |
| `JWT_ACCESS_EXPIRES` | — | Default: `15m` |
| `JWT_REFRESH_EXPIRES` | — | Default: `7d` |
| `SMTP_HOST` | — | Email provider host |
| `SMTP_USER` | — | Email provider username |
| `SMTP_PASS` | — | Email provider password/app-key |
| `CLIENT_URL` | — | Frontend URL for email links |
| `ANALYTICS_SERVICE_URL` | — | Default: `http://analytics:8001` |
| `ANALYTICS_SERVICE_KEY` | — | Must match analytics `INTERNAL_API_KEY` |

### Analytics Service (`analytics-service/.env`)

| Variable | Default | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Bind host |
| `PORT` | `8001` | Bind port |
| `INTERNAL_API_KEY` | `changeme-internal-key` | Must match backend `ANALYTICS_SERVICE_KEY` |
| `LOG_LEVEL` | `info` | Uvicorn log level |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register + create company |
| POST | `/api/v1/auth/login` | Login, get tokens |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/refresh` | Rotate tokens |
| POST | `/api/v1/auth/forgot-password` | Send reset email |
| POST | `/api/v1/auth/reset-password` | Apply new password |
| GET | `/api/v1/auth/verify-email/:token` | Verify email |
| GET | `/api/v1/auth/me` | Current user + company |

All protected routes require:
- `Authorization: Bearer <accessToken>`
- `X-Company-Id: <companyId>` (tenant header)

### Core Resources

| Resource | Base Path |
|---|---|
| Users | `/api/v1/users` |
| Company | `/api/v1/company` |
| Sales | `/api/v1/sales` |
| Expenses | `/api/v1/expenses` |
| Products | `/api/v1/products` |
| Customers | `/api/v1/customers` |
| Analytics | `/api/v1/analytics` |
| Forecasting | `/api/v1/forecasting` |
| AI Insights | `/api/v1/insights` |
| Reports | `/api/v1/reports` |
| Imports | `/api/v1/imports` |
| Notifications | `/api/v1/notifications` |
| Settings | `/api/v1/settings` |

Full OpenAPI docs (dev only): `http://localhost:8001/docs` (analytics service)

---

## User Roles

| Role | Access |
|---|---|
| `super_admin` | All companies, platform admin |
| `company_admin` | Full access to own company |
| `manager` | Read + write, no company settings |
| `analyst` | Read all analytics data |
| `employee` | Create sales/expenses/customers |
| `viewer` | Read-only |

---

## Testing

```bash
cd backend
npm test                # run all tests + coverage
npm run test:watch      # watch mode
```

Tests cover:
- Unit: `crypto.utils`, `jwt.utils`, `auth.service`
- Integration: Auth API, Sales API

---

## Deployment

### VPS / DigitalOcean Droplet

```bash
# On the server
git clone https://github.com/yourorg/business-insights-pro.git
cd business-insights-pro
cp backend/.env.example backend/.env
# Edit backend/.env with production values
docker compose up --build -d
```

Point your domain's A record to the server IP. For HTTPS, uncomment the SSL server block in `nginx/nginx.conf` and mount certificates to `/etc/nginx/ssl/`.

### SSL with Let's Encrypt (Certbot)

```bash
apt install certbot
certbot certonly --standalone -d yourdomain.com
# Certificates saved to /etc/letsencrypt/live/yourdomain.com/
```

Mount certs in `docker-compose.yml`:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
    - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

### AWS EC2

1. Launch EC2 (t3.medium recommended, Ubuntu 22.04)
2. Open ports 80, 443 in security group
3. Install Docker: `curl -fsSL https://get.docker.com | sh`
4. Follow VPS steps above

---

## Project Structure

```
business-insights-pro/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── __tests__/          # Jest unit + integration tests
│   │   ├── config/             # env, database, logger
│   │   ├── middleware/         # auth, tenant, rate-limit, audit, error
│   │   ├── models/             # Mongoose schemas
│   │   ├── modules/            # Feature modules (auth, sales, expenses...)
│   │   ├── repositories/       # Data access layer
│   │   ├── services/           # Business logic services
│   │   └── utils/              # JWT, crypto, response helpers
│   ├── Dockerfile
│   └── jest.config.ts
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── app/                # Redux store + slices
│   │   ├── components/         # Shared UI + charts
│   │   ├── features/           # Feature modules (dashboard, sales...)
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Axios, React Query config
│   │   └── routes/             # React Router config
│   └── Dockerfile
├── analytics-service/          # Python/FastAPI ML engine
│   ├── app/
│   │   ├── models/             # Pydantic request/response models
│   │   ├── routers/            # FastAPI route handlers
│   │   └── services/           # Forecasting algorithms
│   └── Dockerfile
├── nginx/                      # Reverse proxy
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml          # Production
└── docker-compose.dev.yml      # Development
```

---

## Security

- JWT access tokens (15m) + rotating refresh tokens (7d)
- Bcrypt password hashing (cost 12)
- Helmet HTTP security headers
- Rate limiting (auth: 5/min, API: 30/s)
- Input sanitization (XSS, NoSQL injection)
- Audit logging for all write operations
- Tenant isolation — all queries scoped by `companyId`
- Internal service-to-service API key authentication

---

## License

MIT — free for personal and commercial use.
