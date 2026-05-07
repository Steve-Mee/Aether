FROM python:3.12-slim

# Air-gapped inference container — minimal attack surface
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/ai-agents/mail-agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ai-agents/mail-agent/agent.py .

# No network access by default (set at runtime with --network=none)
CMD ["python", "agent.py"]