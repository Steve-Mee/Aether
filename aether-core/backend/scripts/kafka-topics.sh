#!/usr/bin/env bash
# Provision Kafka topics for AETHER production (run against broker admin API or kafka-topics.sh).
set -euo pipefail

BROKERS="${KAFKA_BROKERS:-localhost:9092}"
RF="${KAFKA_TOPIC_REPLICATION_FACTOR:-3}"
RETENTION_MS="${KAFKA_TOPIC_RETENTION_MS:-604800000}"

TOPICS=(
  "aether.domain.agent_peer_requested"
  "aether.domain.dlq"
  "aether.federated.execute"
  "aether.federated.execute.response"
)

for topic in "${TOPICS[@]}"; do
  echo "Creating topic ${topic} (RF=${RF})"
  kafka-topics.sh --bootstrap-server "${BROKERS}" \
    --create --if-not-exists \
    --topic "${topic}" \
    --partitions 3 \
    --replication-factor "${RF}" \
    --config retention.ms="${RETENTION_MS}" || true
done

echo "Done."
