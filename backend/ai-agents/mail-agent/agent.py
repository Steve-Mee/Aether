#!/usr/bin/env python3
"""
AETHER Mail Agent v0.5
Lokale LLM-powered email processor (air-gapped waar mogelijk)
"""

import os
import json
import imaplib
import email
from email.header import decode_header
import requests
from typing import Dict, Any

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = "llama3.1:8b"

def classify_email(subject: str, body: str) -> Dict[str, Any]:
    prompt = f"""Classificeer deze email in één van: order_status, tracking_request, simple_question, complaint, return_request, payment_issue, supplier, spam.
Email:
Subject: {subject}
Body: {body[:1500]}

Antwoord ALLEEN met geldige JSON: {{"category": "...", "confidence": 0.0-1.0}}"""

    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": False, "format": "json"},
            timeout=30
        )
        return json.loads(resp.json()["response"])
    except Exception as e:
        print(f"LLM error: {e}")
        return {"category": "simple_question", "confidence": 0.6}

def generate_reply(email_data: Dict, context: Dict) -> str:
    prompt = f"""Je bent een behulpzame e-commerce support agent voor AETHER merchants.
Schrijf een korte, vriendelijke reply in dezelfde taal als de klant.
Context: {json.dumps(context)[:800]}
Email: {email_data['subject']} - {email_data['body'][:600]}

Reply:"""

    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": MODEL, "prompt": prompt, "stream": False},
        timeout=45
    )
    return resp.json()["response"].strip()

def process_email(msg: email.message.Message) -> Dict:
    subject = decode_header(msg["Subject"])[0][0]
    if isinstance(subject, bytes):
        subject = subject.decode()

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode(errors="ignore")
                break
    else:
        body = msg.get_payload(decode=True).decode(errors="ignore")

    classification = classify_email(subject, body)
    # In productie: roep Medusa API aan voor context + opslaan
    context = {"customer": None, "recent_orders": []}  # placeholder

    if classification["confidence"] > 0.85 and classification["category"] in ["order_status", "tracking_request"]:
        reply = generate_reply({"subject": subject, "body": body}, context)
        return {"action": "auto_replied", "reply": reply, "classification": classification}

    return {"action": "proposal_needed", "classification": classification}

if __name__ == "__main__":
    print("AETHER Mail Agent v0.5 gestart (local mode)")
    # TODO: IMAP polling loop toevoegen
    print("Klaar voor integratie met Medusa event bus.")