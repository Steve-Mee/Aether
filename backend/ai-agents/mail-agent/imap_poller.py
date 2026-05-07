#!/usr/bin/env python3
"""
AETHER Mail v0.5 - Full IMAP Polling Service (Sprint 2)
Production-ready lokale email processor met air-gapped LLM
"""

import os
import time
import email
import imaplib
from email.header import decode_header
from datetime import datetime
import json
import requests
from typing import Optional, Dict, Any

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = "llama3.1:8b"
IMAP_SERVER = os.getenv("IMAP_SERVER")
IMAP_USER = os.getenv("IMAP_USER")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
MEDUSA_API_URL = os.getenv("MEDUSA_API_URL", "http://localhost:9000")

class AetherMailPoller:
    def __init__(self):
        self.mail = None
        self.connect()

    def connect(self):
        try:
            self.mail = imaplib.IMAP4_SSL(IMAP_SERVER)
            self.mail.login(IMAP_USER, IMAP_PASSWORD)
            self.mail.select("inbox")
            print(f"[{datetime.now()}] Connected to IMAP")
        except Exception as e:
            print(f"IMAP connection failed: {e}")
            raise

    def classify_and_process(self, msg: email.message.Message) -> Dict[str, Any]:
        subject, encoding = decode_header(msg["Subject"])[0]
        if isinstance(subject, bytes):
            subject = subject.decode(encoding or "utf-8")

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode(errors="ignore")
                    break
        else:
            body = msg.get_payload(decode=True).decode(errors="ignore")

        # Lokale LLM classificatie
        classification = self._classify_local(subject, body)

        # Stuur naar Medusa AETHER Mail service
        payload = {
            "from": msg.get("From"),
            "subject": subject,
            "body": body[:2000],
            "message_id": msg.get("Message-ID"),
            "classification": classification
        }

        try:
            response = requests.post(
                f"{MEDUSA_API_URL}/admin/aether/mail/process",
                json=payload,
                timeout=10
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "action": "failed"}

    def _classify_local(self, subject: str, body: str) -> Dict:
        prompt = f"""Classificeer deze email strikt in één categorie: order_status, tracking_request, simple_question, complaint, return_request, payment_issue, supplier, spam.
Subject: {subject}
Body: {body[:1200]}

Antwoord ALLEEN met JSON: {{"category": "category_name", "confidence": 0.0-1.0, "is_high_risk": true/false}}"""

        try:
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": MODEL, "prompt": prompt, "stream": False, "format": "json"},
                timeout=25
            )
            return json.loads(resp.json()["response"])
        except:
            return {"category": "simple_question", "confidence": 0.5, "is_high_risk": False}

    def run(self, poll_interval: int = 30):
        print("AETHER Mail Poller v0.5 gestart (Sprint 2)")
        while True:
            try:
                status, messages = self.mail.search(None, "UNSEEN")
                if status == "OK":
                    for num in messages[0].split():
                        _, msg_data = self.mail.fetch(num, "(RFC822)")
                        msg = email.message_from_bytes(msg_data[0][1])
                        result = self.classify_and_process(msg)
                        print(f"Processed: {result.get('action', 'unknown')}")
                        self.mail.store(num, "+FLAGS", "\\Seen")
            except Exception as e:
                print(f"Polling error: {e}")
                time.sleep(60)
                self.connect()
            time.sleep(poll_interval)

if __name__ == "__main__":
    poller = AetherMailPoller()
    poller.run()