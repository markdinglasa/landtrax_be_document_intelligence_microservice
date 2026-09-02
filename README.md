# Document Intelligence Microservice (NestJS)

Formerly known as the "OCR Module", this microservice is the analytical brain of the Landtrax platform. It uses advanced machine learning, optical character recognition (OCR), and AI to extract text, validate requirements, summarize contents, and detect potential fraud in uploaded documents.

Because this service performs heavy CPU/GPU-bound computations and relies on expensive 3rd-party AI APIs (like AWS Textract or OpenAI), its architecture is entirely **asynchronous and event-driven**, heavily utilizing message queues (BullMQ/RabbitMQ).

---

## 1. Folder Structure

_Note: In alignment with NestJS DDD best practices, the Dashboard and Reporting modules have been merged into a single microservice since they share the same architectural goal: Heavy Data Aggregation._

```text
/document-intelligence-microservice
├── src/
│   ├── config/
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   ├── domains/
│   │   ├── classification/
│   │   │   ├── application/     <-- Use cases, Services
│   │   │   ├── domain/          <-- Entities, Value Objects
│   │   │   ├── infrastructure/  <-- Repositories, Adapters
│   │   │   ├── presentation/    <-- Controllers
│   │   │   └── dashboard.module.ts
│   │   ├── extraction/   
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── extraction.module.ts
│   │   ├── queue/   
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── extraction.module.ts
│   │   └── validation/
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

### Upstream Dependencies (Who depends on Document Intelligence)
Because this is an event-driven "Worker" microservice, no service strictly depends on it via synchronous HTTP calls.
- **Document Library & Transaction Services:** Rely on Document Intelligence to *eventually* process uploaded documents and emit a `ProcessingCompleteEvent` so they can update the UI to show the extracted fields or validation status.

### Downstream Dependencies (What Document Intelligence depends on)
- **External AI/OCR APIs:** AWS Textract, Google Cloud Vision, OpenAI API, etc., for the actual heavy lifting.
- **Message Broker & Redis:** **CRITICAL**. Redis + BullMQ (or RabbitMQ) acts as the queue that feeds documents into this service at a controlled rate.
- **Cloud Object Storage (AWS S3):** Needs to download the physical document binary to run processing.
- **Database (PostgreSQL/MySQL):** **Shared Database (Phase 1)** - Shares the DB to write `ExtractedFields` and read `Requirements`.

---

## 3. Risk & Impact Analysis (Phase 1: Shared Database)

| Risk ID | Category | Description | Impact |
|---------|----------|-------------|--------|
| **RSK-01** | Compute | **CPU Starvation:** Running text parsing or regex matching on 100-page legal documents is extremely CPU intensive. If 50 documents arrive at once, the Node.js event loop will block, causing the service to crash. | **CRITICAL** |
| **RSK-02** | Financial | **Runaway API Costs (Rate Limiting):** External AI APIs (like AWS Textract) charge per page. If a malicious user spams document uploads, or if a bug causes an infinite processing loop, you will incur massive billing spikes and `429 Too Many Requests` API bans. | **HIGH** |
| **RSK-03** | Architecture| **Timeout Failures:** AI models take seconds to minutes to run. If another service waits for an HTTP response from this service, the connection will invariably timeout. | **HIGH** |

---

## 4. Mitigations

### MIT-01: Strict Queue Concurrency (Addresses RSK-01 & RSK-03)
- **Strategy:** Never process requests synchronously via HTTP. Control the flow of work.
- **Implementation:** Utilize **BullMQ** (which is already in your `package.json`). When the Document Library fires a `DocumentUploadedEvent`, it lands in a Redis queue. The Document Intelligence service acts as a "Worker" that consumes jobs from the queue with strict concurrency (e.g., `concurrency: 5`). This ensures the CPU is never overwhelmed, and HTTP requests never timeout.

### MIT-02: Exponential Backoff & Circuit Breakers (Addresses RSK-02)
- **Strategy:** Gracefully handle external API limits and failures.
- **Implementation:** If AWS Textract returns a `429 Rate Limit Exceeded` error, the BullMQ processor must catch the error and throw it back into the queue with an **Exponential Backoff** retry strategy (e.g., wait 10s, then 30s, then 2m). Use Circuit Breakers to stop processing entirely if the external API is offline.

### MIT-03: Event-Driven Choreography (Addresses RSK-03)
- **Strategy:** Once processing finishes, notify the system rather than returning a response.
- **Implementation:** When the Fraud Detection and Extraction services finish analyzing a document, the microservice writes the `extracted_fields` to the database and publishes a `DocumentProcessedEvent`. The Transaction service listens to this event to automatically move the staging phase forward if all requirements are met!

---

## 5. Microservice Cross-Domain Dependencies

This section strictly outlines what external Microservices the **Document Intelligence Service** relies upon, identifying the exact source and the Intelligence services consuming them to prevent architectural gaps.

### 1. Document Library Microservice
**Purpose:** To retrieve the physical document for processing and write the extracted metadata back to the document record.
**Source Required:** `Document Service`, `Storage Service`
**Used By Intelligence Services:**
- `extraction.service.ts`: To pull the S3 Presigned URL, download the PDF into memory, run OCR, and map the results to the `ExtractedFields` table.
**Method of Invocation:** Asynchronous (Triggered by Message Broker).

### 2. Reference & Transaction Microservices
**Purpose:** To know what a document is *supposed* to contain so it can validate it.
**Source Required:** `Requirement Service` (Reference), `Staging Service` (Transaction)
**Used By Intelligence Services:**
- `validation.service.ts`: When analyzing an uploaded document (e.g., "Proof of Identity"), this service needs to pull the exact rules from the `Requirement Service` (e.g., "Must contain a photo, must not be expired") to check if the extracted text meets the criteria.
**Method of Invocation:** Synchronous (Direct Database Query via Shared DB in Phase 1, or Redis Cache lookup).

### 3. Alert Module (Email & Notification Services)
**Purpose:** To trigger immediate alarms if severe fraud or anomalies are detected.
**Source Required:** `Alert Service` (`notification.service.ts`)
**Used By Intelligence Services:**
- `fraud-detection.service.ts`: If the system detects a forged signature or a photoshopped title document, it immediately fires an alert to the platform administrators for manual review.
**Method of Invocation:** Strictly Asynchronous (via Message Broker).

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
