# Analytics & Reports Microservice (NestJS)

Consolidates the Dashboard, Widgets, and all Reporting modules.

Unlike operational microservices that focus on writing data (OLTP), this microservice is purely analytical (OLAP). Its primary purpose is to aggregate, filter, and export massive amounts of data from across the entire Landtrax platform without degrading the performance of the core business services.

---

## 1. Folder Structure

_Note: In alignment with NestJS DDD best practices, the Dashboard and Reporting modules have been merged into a single microservice since they share the same architectural goal: Heavy Data Aggregation._

```text
/analytics-reports-microservice
├── src/
│   ├── config/
│   │   ├── database-read-replica.config.ts <-- CRITICAL: Must point to a Read-Replica
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   ├── domains/
│   │   ├── dashboard/           <-- Bounded Context: Dashboard & Widgets
│   │   │   ├── application/     <-- Use cases, Services
│   │   │   ├── domain/          <-- Entities, Value Objects
│   │   │   ├── infrastructure/  <-- Repositories, Adapters
│   │   │   ├── presentation/    <-- Controllers
│   │   │   └── dashboard.module.ts
│   │   ├── reports/             <-- Bounded Context: Report Exports
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── reports.module.ts
│   │   └── data-sync/           <-- Phase 2 CQRS: Listens to broker to build local read models
│   │       ├── application/
│   │       ├── domain/
│   │       ├── infrastructure/
│   │       ├── presentation/
│   │       └── data-sync.module.ts
│   ├── shared/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   └── utils/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── assets/
├── migrations/
├── seeder/
└── test/
```

---

## 2. Dependencies Analysis

### Upstream Dependencies (Who depends on Analytics & Reports)

- **Frontend / Administrators:** Managers and Admins rely on this service to view operational dashboards and download massive CSV/Excel/PDF reports.

### Downstream Dependencies (What Analytics & Reports depends on)

- **Database (PostgreSQL/MySQL):** **Shared Database (Phase 1)** - Relies heavily on the database to query aggregated metrics.
- **Cloud Object Storage (AWS S3):** For temporarily storing massive generated reports before the user downloads them.
- **Message Broker (RabbitMQ/Kafka/BullMQ):** Crucial for Phase 2 preparation (CQRS).

---

## 3. Risk & Impact Analysis (Phase 1: Shared Database)

| Risk ID    | Category     | Description                                                                                                                                                                                                                                                                   | Impact       |
| ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **RSK-01** | Database     | **The "Query of Death":** Running a report that aggregates 5 years of `Transactions`, `Users`, and `Payments` using massive `JOIN` and `GROUP BY` statements will lock the tables in the Shared Database, causing the entire platform (including IAM logins) to freeze.       | **CRITICAL** |
| **RSK-02** | Compute      | **OOM (Out of Memory) Crashes:** Fetching 500,000 rows from the database into Node.js memory to generate an Excel/CSV file will instantly exhaust the server's RAM, causing a fatal crash.                                                                                    | **CRITICAL** |
| **RSK-03** | Architecture | **Phase 2 Decoupling Nightmare:** In Phase 1, you can just `JOIN` tables. But when Phase 2 moves `Users` and `Transactions` to separate databases, this microservice's queries will instantly break because you cannot perform SQL `JOIN`s across different database servers. | **HIGH**     |

---

## 4. Mitigations

### MIT-01: Read-Replica Enforcement (Addresses RSK-01)

- **Strategy:** Protect the primary operational database.
- **Implementation:** Even though you are using a Shared Database in Phase 1, this microservice MUST be configured to connect to a **Read-Replica** of the database. All complex aggregations and reports will run on the replica, ensuring that even if a query takes 10 minutes to run, it will never lock the primary writer node that handles live traffic.

### MIT-02: Node.js Data Streaming & Asynchronous Exports (Addresses RSK-02)

- **Strategy:** Never load an entire report into RAM.
- **Implementation:**
  1. For small reports, use Node.js Streams (e.g., streaming rows directly from TypeORM to `fast-csv` to the HTTP Response). Memory usage will remain flat regardless of file size.
  2. For massive reports, make the endpoint **asynchronous**. The endpoint returns `202 Accepted`. A background worker streams the query to an S3 file. When finished, the Alert Service sends the Admin an email with a download link.

### MIT-03: CQRS & Materialized Views (Addresses RSK-01 & RSK-03)

- **Strategy:** Prepare the microservice to own its own data.
- **Implementation:** Introduce the **CQRS (Command Query Responsibility Segregation)** pattern. The `/data-sync` module listens to the Message Broker for domain events (`TransactionCreated`, `UserCreated`). It uses these events to build denormalized, flattened "Read Models" in its own dedicated tables. This makes queries lightning fast and completely decouples it from the other microservices' databases for Phase 2.

---

## 5. Microservice Cross-Domain Dependencies

This section strictly outlines what external Microservices the **Analytics & Reports Service** relies upon, identifying the exact source and the services consuming them to prevent architectural gaps.

### 1. Alert Microservice (Email & Notification Services)

**Purpose:** To notify administrators when long-running, massive report generations are complete.
**Source Required:** `Alert Service` (`email.service.ts`)
**Used By Reports Services:**

- `/reports/services`: When an asynchronous report generation finishes uploading to S3, this service fires an event to the Alert microservice to email the user a temporary Presigned Download URL.
  **Method of Invocation:** Strictly Asynchronous (via Message Broker).

### 2. Audt Microservice

**Purpose:** Compliance logging to track the exfiltration of sensitive company data.
**Source Required:** `AuditTrail Service` (`audit.service.ts` or `@AuditDescription()`)
**Used By Dashboard & Reports Services:**

- `/reports/services`: To log exactly _who_ requested a massive export of User Data or Financial Records, and _when_ they downloaded it.
  **Method of Invocation:** Strictly Asynchronous (via Message Broker).

_(Note: Because this service reads data directly from the Read-Replica or its own CQRS read-models, it does not make synchronous HTTP calls to IAM, Transaction, or Payment to gather data)._

## 6. Installation & Setup Guide

### 6.1 Prerequisites

Before getting started, ensure you have the following software installed:

- **Node.js**: `v20.x` or `v24.x LTS` (aligned with Dockerfile `node:24.11.1-alpine`)
- **NPM**: `v10.x+` (bundled with Node.js)
- **Docker & Docker Compose**: Required for containerized execution and local backing services (MSSQL & Redis)
- **Database Engine**: Microsoft SQL Server (MSSQL 2022) instance or Docker container
- **Cache Engine**: Redis `v7.x+` (Standalone, Sentinel, or Cluster)
- **C/C++ Build Tools & Python 3**: (Optional, for native module compilation like `sharp`/`vips` if building locally on Linux/macOS)

---

### 6.2 Environment Configuration

1. **Navigate to the microservice directory**:

   ```bash
   cd reference-microservice
   ```

2. **Create the environment file**:

   ```bash
   cp .env.example .env
   ```

3. **Configure essential environment variables** in `.env`:
   - **Application Settings**:
     ```env
     APP_ENV=development
     PORT=3000
     HOST=localhost
     ```
   - **Database (MSSQL)**:
     ```env
     DATABASE_PROVIDER=MSSQL
     DB_HOST=localhost
     DB_PORT=1433
     DB_USER=sa
     DB_PASSWORD=YourStrongPassword!
     DB_NAME=landtrax
     ENABLE_DATABASE_SYNCHRONIZATION=false
     ENABLE_DATABASE_SEEDER=false
     ```
   - **Redis Cache & BullMQ**:
     ```env
     REDIS_ENABLED=true
     REDIS_HOST=localhost
     REDIS_PORT=6379
     REDIS_PASSWORD=
     REDIS_TLS=false
     ```
   - **Authentication & Encryption**:
     ```env
     APP_AUTH=your_app_auth
     JWT_ACCESS_SECRET=your_jwt_access_secret
     JWT_REFRESH_SECRET=your_jwt_refresh_secret
     ENCRYPTION_PASSPHRASE=your_passphrase
     ```

---

### 6.3 Local Development Setup

#### 1. Install Dependencies

Install all required Node.js packages:

```bash
npm install --legacy-peer-deps
```

#### 2. Start Backing Services (Docker)

If you do not have local MSSQL and Redis instances running, start them using Docker:

```bash
# Start Redis container
docker run -d --name landtrax-redis -p 6379:6379 redis:7-alpine

# Start MSSQL 2022 container
docker run -d --name landtrax-mssql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrongPassword!" \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

#### 3. Database Initialization & Seeding

To initialize the schema and populate reference catalogs:

- For initial database schema generation: Set `ENABLE_DATABASE_SYNCHRONIZATION=true` in `.env` for the first run, then set it back to `false`.
- To seed initial system settings, categories, and service checklists: Set `ENABLE_DATABASE_SEEDER=true` in `.env`.

#### 4. Run the Application

- **Development Mode** (with hot reload / watch mode):

  ```bash
  npm run start:dev
  ```

- **Debug Mode**:

  ```bash
  npm run start:debug
  ```

- **Production Build & Run**:
  ```bash
  npm run build
  npm run start:prod
  ```

---

### 6.4 Docker Deployment

#### 1. Build the Docker Image

```bash
docker build -t landtrax-reference-service:latest .
```

#### 2. Run the Container

```bash
docker run -d \
  --name landtrax-reference-service \
  -p 3000:3000 \
  --env-file .env \
  landtrax-reference-service:latest
```

#### 3. Run with Docker Compose (Recommended)

Example `docker-compose.yml` configuration:

```yaml
version: '3.8'

services:
  reference-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: reference-microservice
    ports:
      - '3000:3000'
    env_file:
      - .env
    environment:
      - DB_HOST=mssql
      - REDIS_HOST=redis
    depends_on:
      - mssql
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: reference-redis
    ports:
      - '6379:6379'
    restart: unless-stopped

  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: reference-mssql
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=YourStrongPassword!
    ports:
      - '1433:1433'
    restart: unless-stopped
```

Start the full stack:

```bash
docker-compose up -d
```

---

### 6.5 Verification & Health Checks

Once the microservice is running:

- **Swagger / API Documentation**: Navigate to `http://localhost:3000/api` (or configured API prefix).
- **Health Check Endpoint**: Test if the service is alive:
  ```bash
  curl http://localhost:3000/health
  ```
- **Verify Redis Connection**: Check service logs for confirmation of Redis caching layer initialization.

---

### 6.6 Testing

Run the test suite using standard NestJS test scripts:

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

---

### 6.7 Troubleshooting

| Issue                                             | Possible Cause                                      | Solution                                                                                               |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **MSSQL Connection Refused**                      | Database container not running or port 1433 blocked | Verify MSSQL container status and ensure `DB_HOST`, `DB_PORT`, and credentials in `.env` are accurate. |
| **Redis Connection Error**                        | Redis server down or invalid host/port              | Ensure Redis is active on port 6379 and `REDIS_ENABLED=true` in `.env`.                                |
| **Native Module Build Failures (`sharp`/`vips`)** | Missing C++ compiler or libvips                     | Run via Docker or install dependencies locally (`brew install vips` on macOS).                         |
| **Duplicate Key / Seeder Errors**                 | Re-running seeder on existing records               | Set `ENABLE_DATABASE_SEEDER=false` after the initial seed run.                                         |
