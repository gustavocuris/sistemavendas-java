Backend (Express + SQLite)

Quick start:

1. Install Node.js (18+)
2. In this folder run:

```bash
npm install
npm start
```

The API endpoints:
- GET  /api/sales           -> list sales
- POST /api/sales           -> create sale (JSON body)
- PUT  /api/sales/:id       -> update sale
- DELETE /api/sales/:id     -> delete sale

Required fields for create/update: `date`, `client`, `product`, `unit_price`, `quantity`.
