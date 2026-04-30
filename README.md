# Aria — Meridian Electronics AI Shopping Assistant

Aria is a conversational AI shopping assistant for Meridian Electronics. Users chat with Aria to browse products, compare specifications, place orders, and track purchases — all through a natural language interface powered by GPT-4o mini and a set of live commerce tools exposed via the Model Context Protocol (MCP).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Possible Improvements](#possible-improvements)

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │             Next.js Frontend  (port 3000)               │   │
│   │                                                         │   │
│   │  Header ─── ChatInterface ─── ChatInput                 │   │
│   │                  │                │                     │   │
│   │           Markdown render    POST /api/v1/chat          │   │
│   └──────────────────────────────────┬──────────────────────┘   │
└─────────────────────────────────────-│──────────────────────────┘
                                       │ HTTP (JSON)
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend  (port 8000)                  │
│                                                                  │
│   POST /api/v1/chat                                              │
│         │                                                        │
│         ▼                                                        │
│   run_assistant_agent(messages)                                  │
│         │                                                        │
│         ▼                                                        │
│   OpenAI Agents SDK  ──── gpt-4o-mini ────────────────────┐     │
│         │                                                  │     │
│         │  tool calls                                      │     │
│         ▼                                                  │     │
│   MCP Client ──► https://order-mcp-*.run.app/mcp          │     │
│         │              (Google Cloud Run)                  │     │
│         │  tool results                                    │     │
│         └──────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### How a request flows

1. The user types a message in the chat input and presses Enter.
2. The frontend appends the new message to the full conversation history and `POST`s `{ messages }` to `/api/v1/chat`.
3. FastAPI passes the history to `run_assistant_agent`, which creates an OpenAI Agents SDK `Agent` (Aria) connected to the MCP server.
4. The SDK runs a reasoning loop (up to 15 turns). When Aria decides to use a tool, the SDK calls the relevant MCP tool — `search_products`, `get_product`, `create_order`, etc. — and feeds the result back to the model.
5. Once Aria produces a final answer, the backend returns `{ success: true, response: "..." }`.
6. The frontend appends the assistant message and renders it as Markdown.

---

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Frontend framework | Next.js (App Router) | 16.2.4 |
| UI library | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| Markdown rendering | react-markdown | ^10 |
| Language (frontend) | TypeScript | ^5 |
| Backend framework | FastAPI | ≥0.136 |
| AI agent runtime | openai-agents[litellm] | ≥0.14.8 |
| LLM | gpt-4o-mini | — |
| Tool protocol | MCP (HTTP transport) | — |
| Language (backend) | Python | ≥3.12 |
| Container registry | AWS ECR | — |
| Compute | AWS App Runner | — |
| Infrastructure as code | Terraform | — |

---

## Project Structure

```text
ai-bootcamp-assessment/
│
├── .env                        # Root env (AWS creds, OpenAI key) — do not commit
├── Dockerfile                  # Multi-stage build for the FastAPI backend
├── scripts/
│   └── deploy.sh               # Build → push to ECR → update App Runner
│
├── backend/
│   ├── main.py                 # FastAPI app, CORS, routes, error handlers
│   ├── agent.py                # Aria agent definition and Runner.run() call
│   ├── context.py              # System prompt and agent behavioural rules
│   ├── mcp_server.py           # MCP HTTP client (connects to the remote tool server)
│   ├── schemas.py              # Pydantic request schema (ChatRequest)
│   └── pyproject.toml          # Python dependencies (uv)
│
├── frontend/
│   ├── .env.local              # NEXT_PUBLIC_API_URL
│   ├── next.config.ts
│   ├── app/
│   │   ├── layout.tsx          # Root layout — fonts, metadata
│   │   ├── page.tsx            # Home page — state, top-level composition
│   │   ├── globals.css         # Design tokens, Tailwind import, prose styles
│   │   ├── types.ts            # Message interface
│   │   ├── constants.ts        # WELCOME message constant
│   │   └── components/
│   │       ├── Header.tsx      # Logo, title, "Online" badge
│   │       ├── ChatInterface.tsx  # Message list, avatars, Markdown bubbles
│   │       └── ChatInput.tsx   # Auto-resizing textarea, send button, fetch
│   └── public/
│       └── fonts/              # Self-hosted Geist woff2 files (no Google Fonts request)
│
└── terraform/
    ├── main.tf                 # ECR repo, App Runner service, IAM roles
    ├── variables.tf            # aws_region, openai_api_key
    ├── outputs.tf              # ECR URL, App Runner service URL
    ├── backend.tf              # S3 state backend + DynamoDB locking
    ├── github-oidc.tf          # GitHub Actions OIDC role (gitignored)
    └── backend-setup.tf        # Bootstraps the S3 bucket + DynamoDB table (gitignored)
```

### Key backend files

**`agent.py`** — Creates an `Agent` named Aria using `gpt-4o-mini`, attaches the MCP server as a tool source, and calls `Runner.run()` with the user's conversation history. Returns the agent's `final_output`.

**`context.py`** — The system prompt. Defines Aria's persona, the tools she can use, and strict behavioural constraints: never hallucinate product data, always use tools instead of guessing, require PIN verification before placing any order.

**`mcp_server.py`** — Opens an HTTP-based MCP session to the remote order server, which exposes seven tools:

| Tool | Description |
| --- | --- |
| `list_products` | Returns the full product catalogue |
| `search_products` | Keyword search across the catalogue |
| `get_product` | Retrieves full details for a single product |
| `verify_customer_pin` | Authenticates a customer before checkout |
| `create_order` | Places an order on behalf of a customer |
| `list_orders` | Lists a customer's order history |
| `get_order` | Retrieves details for a specific order |

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.12
- **uv** (Python package manager) — `pip install uv` or follow [uv docs](https://github.com/astral-sh/uv)
- An **OpenAI API key** with access to `gpt-4o-mini`

### 1. Clone the repository

```bash
git clone <repo-url>
cd ai-bootcamp-assessment
```

### 2. Backend

```bash
cd backend

# Install dependencies
uv sync

# Create environment file
cp ../.env.example .env          # or create manually
echo "OPENAI_API_KEY=sk-..." >> .env

# Start the API server
uv run uvicorn main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.  
Verify with:

```bash
curl http://localhost:8000/health
# → {"message":"Backend API is healthy!","success":true}
```

To confirm the MCP tool server is reachable:

```bash
curl http://localhost:8000/mcp-test
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Confirm the API URL points to your local backend
cat .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see Aria's welcome message.

### 4. Sending your first message

Type a message such as _"What laptops do you have under $1000?"_ and press **Enter**. The frontend sends the conversation history to the backend, the agent queries the MCP server for products, and the response is streamed back and rendered as Markdown.

---

## Deployment

Deployment targets **AWS App Runner** via a Docker container stored in **ECR**. Terraform manages all infrastructure.

### First-time infrastructure setup

```bash
cd terraform

# Bootstrap the S3 state bucket and DynamoDB lock table (run once)
terraform -chdir=backend-setup.tf init && terraform apply

# Deploy main infrastructure (ECR + App Runner)
terraform init
terraform apply -var="aws_region=eu-west-1" -var="openai_api_key=sk-..."
```

### Deploy a new version

```bash
# From repo root — builds Docker image, pushes to ECR, updates App Runner
./scripts/deploy.sh
```

The script:

1. Reads AWS credentials and config from `.env`
2. Logs in to ECR
3. Builds the image for `linux/amd64`
4. Tags and pushes to the ECR repository
5. Triggers an App Runner deployment
6. Polls until the service status returns `RUNNING` (timeout: 10 minutes)

### GitHub Actions (CI/CD)

The `terraform/github-oidc.tf` file provisions an OIDC trust between GitHub Actions and AWS, so deployments can run without storing long-lived AWS credentials as secrets. Add the output role ARN to your repository's Actions secrets as `AWS_ROLE_ARN`.

---

## Environment Variables

### Backend (`.env` in repo root)

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API key — must have access to `gpt-4o-mini` |
| `AWS_ACCOUNT_ID` | AWS account ID (used by `deploy.sh` to build the ECR URL) |
| `DEFAULT_AWS_REGION` | AWS region for ECR and App Runner (e.g. `eu-west-1`) |
| `ENVIRONMENT` | Set to `production` in App Runner to open CORS to all origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API. Use `http://localhost:8000` locally and the App Runner URL in production |

---

## Possible Improvements

### Streaming responses

The backend currently waits for the entire agent loop to complete before returning. Switching to **Server-Sent Events (SSE)** or WebSockets and streaming the model's token output would dramatically reduce perceived latency for long answers.

### Conversation persistence

Messages live only in React state — refreshing the page resets the conversation. Adding a database (e.g. **Neon Postgres** or **DynamoDB**) to persist sessions by a user or session ID would allow users to return to a previous conversation.

### Authentication

The storefront currently has no user login. Integrating an auth provider (e.g. **Clerk** or **Auth0**) would tie conversation history and order records to real accounts, and remove the need for the in-chat PIN verification flow.

### Richer product UI

High-confidence product results (e.g. a direct `get_product` call) could render as **structured cards** — image, price, rating, add-to-cart button — rather than Markdown text, giving a much more polished shopping experience.

### Rate limiting and abuse prevention

The `/api/v1/chat` endpoint has no rate limiting. Adding a per-IP or per-session request limit (e.g. via a Redis-backed middleware) would prevent runaway usage and control OpenAI API costs.

### Evaluation and tracing

The OpenAI Agents SDK emits traces, but they are not currently surfaced anywhere. Integrating **Langfuse**, **Braintrust**, or the OpenAI Evals dashboard would make it possible to track agent accuracy, tool call success rates, and latency over time.

### Frontend deployment

The Next.js frontend is not yet deployed. Hosting it on **Vercel** (with `NEXT_PUBLIC_API_URL` pointed at the App Runner service) would give the project a public URL with automatic preview deployments on every pull request.

### Docker Compose for local development

Running backend and frontend together currently requires two separate terminal sessions. A `docker-compose.yml` with both services (and environment variable injection) would simplify onboarding for new contributors.

### Test coverage

There are currently no automated tests. Adding **pytest** fixtures for the FastAPI routes (mocking the MCP server), and **Playwright** or **Vitest** tests for the React components, would protect against regressions as the codebase grows.
