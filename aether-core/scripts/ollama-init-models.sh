#!/bin/sh
# Pull required Ollama models for AETHER intelligence layer (run after ollama serve is up)
set -e
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
echo "Waiting for Ollama at ${OLLAMA_HOST}..."
until wget -qO- "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; do sleep 2; done
echo "Pulling nomic-embed-text..."
OLLAMA_HOST="${OLLAMA_HOST}" ollama pull nomic-embed-text
echo "Pulling llama3.2..."
OLLAMA_HOST="${OLLAMA_HOST}" ollama pull llama3.2
echo "Ollama models ready."
