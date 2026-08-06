# Monitoring Dashboard Guide — AETHER

Self-hosted monitoring setup for AETHER using OpenTelemetry, Jaeger, Prometheus, and Grafana.

## Overview

AETHER includes built-in observability with multiple monitoring layers:

1. **Jaeger** (distributed tracing) — included in docker-compose
2. **Sentry** (error tracking) — external SaaS (see `observability-runbook.md`)
3. **Prometheus + Grafana** (metrics & dashboards) — optional, guide below
4. **Application logs** — structured logs via Winston/Pino

## Current Setup (Jaeger)

AETHER ships with Jaeger for distributed tracing.

### Access Jaeger

- **URL**: http://localhost:16686
- **Service name**: `aether-backend`, `aether-frontend`

### What to Monitor

| View | Purpose | What to Look For |
|------|---------|------------------|
| **Search** | Find traces | Slow requests (>2s), error spans |
| **System Architecture** | Service dependencies | Backend → Redis, Backend → Postgres, Frontend → Backend |
| **Trace Timeline** | Request flow | Long DB queries, slow LLM inference |

### Key Traces

- `http.POST./api/admin/commands/execute` — Command execution flow
- `http.POST./api/admin/approvals/bulk-resolve` — Approval resolution
- `mail.analyze` — AETHER Mail processing
- `brain.query` — PersonalBrain RAG retrieval

### Example: Finding Slow Queries

1. Open Jaeger at http://localhost:16686
2. Service: `aether-backend`
3. Operation: `http.POST./api/admin/commands/execute`
4. Tags: `http.status_code=200`
5. Min Duration: `2s`
6. Click "Find Traces"
7. Inspect spans for `db.query` operations

## Adding Prometheus + Grafana (Optional)

For production deployments, add metrics and dashboards.

### 1. Update docker-compose.yml

Add Prometheus and Grafana services:

```yaml
# Add to aether-core/docker-compose.yml

  prometheus:
    image: prom/prometheus:v2.45.0
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - aether_internal

  grafana:
    image: grafana/grafana:10.0.0
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    networks:
      - aether_internal

# Add to volumes section:
volumes:
  # ... existing volumes ...
  prometheus_data:
  grafana_data:
```

### 2. Create Prometheus Configuration

Create `config/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Backend metrics (if you add Prometheus exporter)
  - job_name: 'aether-backend'
    static_configs:
      - targets: ['backend:9000']
    metrics_path: '/metrics'

  # PostgreSQL exporter (optional)
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis exporter (optional)
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Docker container metrics (optional)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

### 3. Add Backend Metrics Endpoint

Install Prometheus client in backend:

```bash
cd backend
npm install prom-client
```

Create `backend/src/shared/observability/metricsService.ts`:

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Command execution metrics
export const commandExecutionDuration = new Histogram({
  name: 'command_execution_duration_seconds',
  help: 'Duration of command execution',
  labelNames: ['command_type', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const commandExecutionTotal = new Counter({
  name: 'command_executions_total',
  help: 'Total number of command executions',
  labelNames: ['command_type', 'status'],
});

// LLM inference metrics
export const llmInferenceDuration = new Histogram({
  name: 'llm_inference_duration_seconds',
  help: 'Duration of LLM inference',
  labelNames: ['model', 'provider'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

export const llmInferenceTokens = new Counter({
  name: 'llm_inference_tokens_total',
  help: 'Total tokens used in LLM inference',
  labelNames: ['model', 'provider', 'type'], // type: prompt | completion
});

// Database query metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Active agents gauge
export const activeAgentsGauge = new Gauge({
  name: 'active_agents_count',
  help: 'Number of currently active autonomous agents',
  labelNames: ['agent_type'],
});

// Export registry for /metrics endpoint
export { register };
```

Add metrics endpoint to your Express app:

```typescript
// backend/src/api/platform/routes.ts or similar
import { register } from '../shared/observability/metricsService';

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 4. Configure Grafana Datasource

Create `config/grafana/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: false
```

### 5. Create Grafana Dashboards

Create `config/grafana/dashboards/dashboard-provider.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'AETHER Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

Create `config/grafana/dashboards/aether-overview.json`:

```json
{
  "dashboard": {
    "title": "AETHER Overview",
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 0,
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "HTTP Request Duration (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Command Executions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(command_executions_total[5m])",
            "legendFormat": "{{command_type}} - {{status}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Agents",
        "type": "graph",
        "targets": [
          {
            "expr": "active_agents_count",
            "legendFormat": "{{agent_type}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "LLM Inference Duration (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(llm_inference_duration_seconds_bucket[5m]))",
            "legendFormat": "{{model}} ({{provider}})"
          }
        ]
      },
      {
        "id": 6,
        "title": "Database Query Duration (p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(db_query_duration_seconds_bucket[5m]))",
            "legendFormat": "{{operation}} - {{table}}"
          }
        ]
      }
    ]
  }
}
```

### 6. Start Monitoring Stack

```bash
cd aether-core
docker-compose up -d prometheus grafana
```

Access Grafana:
- **URL**: http://localhost:3001
- **Username**: `admin`
- **Password**: Set in `.env` as `GRAFANA_PASSWORD` (default: `admin`)

## Key Metrics to Monitor

### Application Health

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **HTTP 5xx rate** | > 1% | Check logs, restart if needed |
| **Request duration p95** | > 3s | Investigate slow queries/LLM calls |
| **Command execution failures** | > 5% | Review error logs, check LLM provider |
| **Database connection errors** | > 0 | Check PostgreSQL health |

### Resource Utilization

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **CPU usage** | > 80% sustained | Scale up or optimize |
| **Memory usage** | > 90% | Check for memory leaks, increase limits |
| **Disk usage** | > 85% | Cleanup old logs, scale storage |
| **Database size** | Plan for growth | Archive old data |

### Business Metrics

| Metric | Purpose |
|--------|---------|
| **Commands executed** | Merchant engagement |
| **Approvals resolved** | Autonomy success rate |
| **LLM tokens used** | Cost tracking |
| **Active autonomous agents** | System load |
| **Mail processing time** | AETHER Mail performance |

## Alerting

### Prometheus Alerting Rules

Create `config/prometheus-rules.yml`:

```yaml
groups:
  - name: aether_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP error rate ({{ $value }})"

      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow HTTP requests (p95: {{ $value }}s)"

      - alert: CommandExecutionFailures
        expr: rate(command_executions_total{status="error"}[5m]) / rate(command_executions_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High command execution failure rate ({{ $value }})"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage ({{ $value }}%)"
```

### Integration with Alertmanager

Add to `docker-compose.yml`:

```yaml
  alertmanager:
    image: prom/alertmanager:v0.25.0
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    networks:
      - aether_internal
```

Create `config/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

## Alternative: Using Existing Sentry Setup

If you prefer not to add Prometheus/Grafana, leverage Sentry for monitoring:

### Sentry Performance Monitoring

Sentry already tracks:
- HTTP request duration
- Database query performance
- LLM inference spans (via custom instrumentation)
- Frontend load time

**Access**: Sentry Performance tab → Filter by transaction

### Sentry Custom Metrics

Send business metrics to Sentry:

```typescript
import * as Sentry from '@sentry/node';

// Track command execution
Sentry.metrics.increment('command.executed', 1, {
  tags: { command_type: 'adjust_price', status: 'success' }
});

// Track LLM tokens
Sentry.metrics.distribution('llm.tokens', 1500, {
  tags: { model: 'llama3.2', type: 'completion' }
});
```

## Docker Container Monitoring (Optional)

Add cAdvisor for container metrics:

```yaml
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    privileged: true
    networks:
      - aether_internal
```

## Log Aggregation (Optional)

For centralized logging, add Loki + Promtail:

```yaml
  loki:
    image: grafana/loki:2.8.0
    ports:
      - "3100:3100"
    volumes:
      - ./config/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      - aether_internal

  promtail:
    image: grafana/promtail:2.8.0
    volumes:
      - ./config/promtail-config.yml:/etc/promtail/config.yml
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - aether_internal
```

## Monitoring Checklist

- [ ] Jaeger accessible at http://localhost:16686
- [ ] Sentry DSN configured (see `observability-runbook.md`)
- [ ] Grafana accessible at http://localhost:3001 (if installed)
- [ ] Prometheus scraping metrics at http://localhost:9090 (if installed)
- [ ] Alerting rules configured
- [ ] Dashboards show data
- [ ] Test alert delivery (trigger test alert)

## Troubleshooting

### Prometheus Not Scraping Metrics

1. Check backend `/metrics` endpoint: `curl http://localhost:9000/metrics`
2. Verify Prometheus targets: http://localhost:9090/targets
3. Check Prometheus logs: `docker-compose logs prometheus`

### Grafana Dashboard Empty

1. Verify datasource connection: Grafana → Configuration → Data Sources → Test
2. Check Prometheus has data: http://localhost:9090/graph
3. Verify metric names in queries match your backend

### Jaeger Shows No Traces

1. Check `OTEL_EXPORTER_OTLP_ENDPOINT` in `.env`
2. Verify Jaeger is running: `docker-compose ps jaeger`
3. Trigger a trace: execute a command in AETHER
4. Check backend logs for OTEL errors

## Production Recommendations

1. **Persistent storage** — Use external volumes for Prometheus/Grafana data
2. **Authentication** — Enable Grafana LDAP/OAuth (not just admin password)
3. **Retention** — Configure Prometheus retention: `--storage.tsdb.retention.time=30d`
4. **High availability** — Run Prometheus with remote write (e.g., Thanos, Cortex)
5. **Alerting** — Integrate with PagerDuty/Slack for critical alerts
6. **Backup** — Include Grafana dashboards in backup strategy

## Related Documentation

- `observability-runbook.md` — Sentry setup and verification
- `backup-restore-runbook.md` — Backup monitoring data
- `docker-compose.yml` — Infrastructure configuration

## Further Reading

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Tracing](https://opentelemetry.io/docs/instrumentation/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
