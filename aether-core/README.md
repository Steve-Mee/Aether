# AETHER Core — Technical Setup

This is the official technical foundation for **AETHER Core v1**.

## Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL (or use Docker)
- Git

### 2. Installation

```bash
# Clone or copy this folder
cd aether-core

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start database (with Docker)
docker-compose up -d

# Generate Prisma client & run migrations
npm run prisma:generate
npm run prisma:migrate

# Start development server
npm run dev
```

### 3. Project Structure

```
src/
├── modules/                 # All business modules
│   ├── product-catalog/
│   ├── order-management/
│   ├── aether-mail/
│   └── ...
├── ai/                      # AI Layer (agents, context, decision engine)
├── api/                     # REST + GraphQL endpoints
├── domain/                  # Shared domain logic
└── index.ts                 # Entry point
```

### 4. Available Scripts

| Command                | Description                     |
|------------------------|---------------------------------|
| `npm run dev`          | Start development server        |
| `npm run build`        | Build for production            |
| `npm run prisma:migrate` | Run database migrations       |
| `npm run prisma:studio` | Open Prisma Studio             |
| `npm test`             | Run tests                       |

### 5. Next Steps

1. Start with **Fase 1** from the roadmap
2. Implement the first module: `product-catalog`
3. Add your first AI agent in `src/ai/agents/`

---

**AETHER Core** — Built for the future of autonomous commerce.

**Merchant Success First. Local AI First. Modulair. Uitbreidbaar.**