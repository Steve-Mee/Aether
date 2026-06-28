# Messaging Broker

**Status:** Phase 11 — Kafka production hardening + multi-region federated RPC runbook

## Decision (Phase 10)

| Option | Verdict |
|--------|---------|
| **Kafka** | **Selected** — already integrated (outbox relay, peer-worker, DLQ, consumer groups) |
| **Redis Streams** | **Not adopted** — Redis is used for rate limiting and optional run-memory read cache only; Streams would duplicate broker ops without functional gain at current async volume |

Future Redis Streams support remains possible via `MessageBrokerPort` without changing the outbox pattern.

## Architecture

```
eventBus.publish → DomainEvent (Postgres)
  → in-process handlers (default)
  → OutboxRelayService (FOR UPDATE SKIP LOCKED) → MessageBrokerPort → Kafka topics
  → peer-worker / federated-worker consumers (idempotent)
```

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `MESSAGE_BROKER` | `none` | `kafka` or `none` (`KAFKA_ENABLED=true` still works) |
| `EVENT_BUS_MODE` | `inprocess` | `inprocess`, `dual`, or `kafka` |
| `KAFKA_BROKERS` | `localhost:9092` | Broker list |
| `OUTBOX_RELAY_POLL_MS` | `1000` | Outbox relay interval |
| `OUTBOX_RELAY_OWNER` | `api` | Single relay owner: `api`, `peer-worker`, `federated-worker`, or `none` |
| `KAFKA_SSL_ENABLED` | `false` | Enable TLS for Kafka clients |
| `KAFKA_SASL_MECHANISM` | — | `plain`, `scram-sha-256`, or `scram-sha-512` |
| `KAFKA_SASL_USERNAME` | — | SASL username |
| `KAFKA_SASL_PASSWORD` | — | SASL password |
| `FEDERATED_RPC_TIMEOUT_MS` | `30000` | Federated RPC timeout (increase for multi-region mirror lag) |
| `FEDERATED_DEPLOYMENT_ID` | `local` | Unique deployment identifier per region |

Broker-routed domain events (when `EVENT_BUS_MODE=kafka`):

- `agent.peer.requested` → topic `aether.domain.agent_peer_requested`
- `federated.execute.requested` → topic `aether.domain.federated_execute_requested`

Federated RPC topics:

- `aether.federated.execute`
- `aether.federated.execute.response`

DLQ: `aether.domain.dlq`

## Production hardening (Phase 11c-1)

- **Consumer idempotency:** peer-worker skips events with `DomainEvent.processedAt` set; federated-worker skips duplicate `requestId` via `FederatedExecutionAudit` upsert
- **Relay leader:** only one process relays outbox (`OUTBOX_RELAY_OWNER`)
- **Row claiming:** `OutboxRelayService` uses `FOR UPDATE SKIP LOCKED` on pending rows
- **Observability:** `GET /api/admin/federated/deployments/status` exposes relay backlog and broker type
- **Topic IaC:** `backend/scripts/kafka-topics.sh` (RF=3 for prod)

## Multi-region federated RPC (Phase 11c-2)

**Do not mirror all domain events cross-region.** Mirror only federated RPC topics:

| Topic | Mirroring |
|-------|-----------|
| `aether.federated.execute` | MirrorMaker 2 / Cluster Linking region A → B |
| `aether.federated.execute.response` | Bidirectional mirror |
| `aether.domain.agent_peer_requested` | **Regional only** (peer jobs stay local) |

Per deployment:

1. Set unique `FEDERATED_DEPLOYMENT_ID` per region
2. Run `federated-worker` consuming local cluster; MM2 delivers remote requests
3. Register remote deployments via operator UI or `FederatedDeploymentRegistry` API
4. Set `FEDERATED_RPC_TIMEOUT_MS` ≥ expected mirror lag + processing (default 30s)

### MM2 runbook (ops)

1. Provision Kafka in each region (MSK, Confluent, or self-hosted)
2. Run `backend/scripts/kafka-topics.sh` in each cluster with `KAFKA_TOPIC_REPLICATION_FACTOR=3`
3. Deploy MirrorMaker 2 connectors for `aether.federated.execute` and `aether.federated.execute.response` only
4. Monitor mirror lag; alert if lag > 50% of `FEDERATED_RPC_TIMEOUT_MS`
5. Do **not** mirror `aether.domain.*` peer topics cross-region

**Not in repo:** Terraform/Helm for MSK; active-active Postgres.

## Code

- Port: `backend/src/shared/messaging/MessageBrokerPort.ts`
- Config: `backend/src/shared/messaging/messagingConfig.ts`
- Kafka adapter: `backend/src/shared/messaging/KafkaMessageBrokerAdapter.ts`
- Metrics: `backend/src/shared/messaging/messagingMetrics.ts`
- Workers: `backend/src/peerWorker.ts`, `backend/src/federatedWorker.ts`
- Registry API: `GET/POST/PUT/DELETE /api/admin/federated/deployments`
