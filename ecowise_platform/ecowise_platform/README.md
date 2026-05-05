# EcoKarat — Web Platform

## Setup & Run

### Prerequisites
- Node.js installed
- MongoDB installed (or MongoDB Atlas free account)

### Install & Start
```bash
npm install
node server.js
```

Open: http://localhost:3000

### Demo Login Accounts (auto-seeded)
| Role | Email | Password |
|------|-------|----------|
| 🏛️ Hall | hall1@demo.com | demo123 |
| ♻️ Recycler | recycler@demo.com | demo123 |
| 🏭 Company | company@demo.com | demo123 |
| ⚙️ Admin | admin@ecokarat.com | demo123 |

### For MongoDB Atlas (Cloud)
Replace MONGO_URI in .env:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ecokarat
```

## Pages
- Landing page with flow explanation
- Hall dashboard — schedule pickup, view history
- Recycler dashboard — accept pickups, monthly report
- Company dashboard — EPR marketplace (coming soon)
- Admin dashboard — all data, stats

## API Endpoints
POST /api/register — register user
POST /api/login — login
POST /api/pickups — schedule pickup
GET  /api/pickups — get pickups
PATCH /api/pickups/:id/assign — recycler accepts
PATCH /api/pickups/:id/complete — mark complete
POST /api/reports — submit monthly report
GET  /api/notifications — get notifications
GET  /api/admin/stats — admin stats
POST /api/seed — seed demo data
