# LogStream

A real-time distributed log analysis platform with AI-powered insights and anomaly detection.

## Overview

LogStream is an enterprise-grade log aggregation and analysis system designed for modern microservices architectures. It provides real-time log streaming, intelligent filtering, distributed tracing visualization, and AI-driven hazard detection to help engineering teams quickly identify and resolve production issues.

## Key Features

### Real-Time Log Streaming
- Live log ingestion and display with sub-second latency
- WebSocket-based updates using Azure SignalR
- Buffered ingestion through Azure Event Hubs for high-throughput scenarios

### AI-Powered Analysis
- Natural language search: Query logs using plain English (e.g., "show me payment errors")
- Automated hazard detection with service-level risk scoring
- Intelligent service name mapping for user-friendly queries

### Distributed Tracing
- Trace waterfall visualization for multi-service request flows
- Automatic trace correlation across microservices
- Latency analysis with span-level detail

### Advanced Filtering
- Multi-dimensional filtering by severity, service, and trace ID
- Persistent filter state with visual indicators
- One-click filter reset

### Trend Analysis
- Historical log volume tracking over 15-minute windows
- Separate trend lines for total logs, errors, and warnings
- Real-time chart updates as new logs arrive

## Architecture

### Technology Stack

**Backend:**
- NestJS (Node.js framework)
- Prisma ORM with PostgreSQL
- Azure Event Hubs for log ingestion
- Azure SignalR for real-time communication
- Azure OpenAI for AI capabilities

**Frontend:**
- Next.js 14 with React
- Recharts for data visualization
- TailwindCSS for styling
- Microsoft SignalR client

**Infrastructure:**
- Docker containerization
- Azure cloud services
- PostgreSQL database

### System Components

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   Log Ingestion API             │
│   POST /logs/ingest             │
└──────┬──────────────────────────┘
       │
       ├──────────────┬─────────────────┐
       ▼              ▼                 ▼
┌─────────────┐ ┌──────────┐  ┌────────────────┐
│  Event Hub  │ │ Database │  │ SignalR Service│
└─────────────┘ └──────────┘  └────────┬───────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Web Dashboard  │
                              └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional, for containerized deployment)
- Azure account with the following services:
  - Azure OpenAI
  - Azure SignalR Service
  - Azure Event Hubs

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/log-stream.git
cd log-stream
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Configure environment variables:

Create `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/logstream"

# Azure Event Hubs
EVENTHUB_CONNECTION_STRING="Endpoint=sb://..."
EVENTHUB_NAME="logs-hub"

# Azure SignalR
AZURE_SIGNALR_CONN_STR="Endpoint=https://..."

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_KEY="your-api-key"
AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

5. Initialize the database:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### Running Locally

1. Start the backend:
```bash
cd backend
npm run start:dev
```

2. Start the frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

3. (Optional) Run the traffic simulator:
```bash
node scripts/simulate-traffic.js
```

4. Access the dashboard at `http://localhost:3001`

## API Reference

### Log Ingestion

**POST** `/logs/ingest`

Ingest a new log entry.

**Request Body:**
```json
{
  "source": "payment-gateway",
  "message": "Payment processed successfully",
  "severity": "info",
  "metadata": {
    "traceId": "abc123",
    "latency": 150,
    "userId": "user-456"
  }
}
```

**Response:** `201 Created`

### Retrieve Recent Logs

**GET** `/logs/recent`

Retrieve the 50 most recent logs.

**Response:**
```json
[
  {
    "id": 1,
    "source": "payment-gateway",
    "message": "Payment processed successfully",
    "severity": "info",
    "metadata": { "traceId": "abc123" },
    "createdAt": "2025-12-13T07:30:00.000Z"
  }
]
```

### Severity Breakdown

**GET** `/logs/severity-breakdown`

Get log counts grouped by severity.

**Response:**
```json
[
  { "severity": "error", "count": 15 },
  { "severity": "warn", "count": 32 },
  { "severity": "info", "count": 203 }
]
```

### AI Insights

**POST** `/ai/insights`

Generate AI-powered insights from logs.

**Request Body:**
```json
{
  "logs": [...]
}
```

**Response:**
```json
{
  "insights": {
    "summary": "Multiple services experiencing elevated error rates",
    "services": [
      {
        "name": "payment-gateway",
        "status": "Critical",
        "issues": ["High error rate", "Database connection timeouts"],
        "riskScore": 8
      }
    ]
  }
}
```

### Natural Language Search

**POST** `/ai/search`

Parse natural language queries into structured filters.

**Request Body:**
```json
{
  "query": "show me payment errors"
}
```

**Response:**
```json
{
  "severity": "error",
  "source": "payment-gateway"
}
```

## Deployment

### Docker Deployment

Build and run using Docker Compose:

```bash
docker-compose up -d
```

### Azure Deployment

Refer to `DEPLOYMENT.md` for detailed Azure deployment instructions including:
- Azure Container Apps setup
- Azure Static Web Apps configuration
- Database migration
- Environment variable configuration

## Configuration

### Log Retention

By default, logs are stored indefinitely. Configure retention policies in `backend/src/logs/logs.service.ts`.

### AI Model Selection

The system supports both Azure OpenAI and standard OpenAI. Configure via environment variables:

For Azure OpenAI:
```env
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=...
```

For OpenAI:
```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

### Service Configuration

Update the list of monitored services in:
- `frontend/components/Dashboard.tsx` (line 181)
- `scripts/simulate-traffic.js` (line 2)

## Development

### Project Structure

```
log-stream/
├── backend/
│   ├── src/
│   │   ├── ai/           # AI service and natural language processing
│   │   ├── logs/         # Log ingestion and retrieval
│   │   ├── realtime/     # SignalR integration
│   │   └── prisma/       # Database schema and migrations
│   └── Dockerfile
├── frontend/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   │   └── Dashboard.tsx # Main dashboard component
│   └── Dockerfile
└── scripts/
    └── simulate-traffic.js  # Log generation simulator
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Style

This project uses ESLint and Prettier for code formatting. Run linting:

```bash
npm run lint
```

## Monitoring and Observability

### Health Checks

The backend exposes a health check endpoint:

**GET** `/` - Returns application status

### Metrics

Key metrics to monitor:
- Log ingestion rate (logs/second)
- SignalR connection count
- AI query latency
- Database query performance

## Troubleshooting

### Database Connection Issues

If you see `ECONNREFUSED` errors, the application will fall back to in-memory storage. Verify:
- PostgreSQL is running
- `DATABASE_URL` is correct
- Database exists and migrations are applied

### SignalR Connection Failures

Ensure Azure SignalR is configured in "Serverless" mode:
```bash
az signalr update --name logstream-signalr --resource-group LogStream-RG --service-mode Serverless
```

### AI Service Errors

If AI features fail:
- Verify Azure OpenAI endpoint and API key
- Check deployment name matches your Azure OpenAI deployment
- Ensure API version is compatible

## Performance Considerations

- **Log Volume**: The system handles up to 1000 logs/second with default configuration
- **Retention**: Consider implementing log archival for datasets exceeding 1M logs
- **SignalR**: Free tier supports 20 concurrent connections; upgrade for production use
- **Database**: Use connection pooling for high-concurrency scenarios

## Security

- All API endpoints should be protected with authentication in production
- Use Azure Key Vault for secret management
- Enable HTTPS for all external communication
- Implement rate limiting on log ingestion endpoints
- Regularly rotate API keys and connection strings

## Contributing

Contributions are welcome. Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/log-stream/issues
- Documentation: https://github.com/yourusername/log-stream/wiki

## Roadmap

Planned features:
- Alert system with Slack/Teams integration
- Custom dashboards and saved views
- Advanced anomaly detection with ML
- Multi-environment support
- Service dependency topology visualization
- Log playback and time-travel debugging

## Acknowledgments

Built with:
- NestJS
- Next.js
- Azure Cloud Services
- Recharts
- Prisma
