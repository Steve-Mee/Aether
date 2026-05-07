#!/usr/bin/env python3
"""
AETHER Mail Eval Harness v0.5 (Sprint 2)
Wekelijkse evaluatie van classificatie accuracy en uplift
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict

def generate_test_emails(n: int = 100) -> List[Dict]:
    categories = ["order_status", "tracking_request", "simple_question", "complaint", "return_request"]
    emails = []
    for i in range(n):
        cat = random.choice(categories)
        emails.append({
            "id": f"test_{i}",
            "subject": f"Test email {i} - {cat}",
            "body": f"This is a simulated {cat} email body...",
            "true_category": cat
        })
    return emails

def run_eval(model: str = "llama3.1:8b") -> Dict:
    test_set = generate_test_emails(100)
    correct = 0
    high_risk_correct = 0

    for email in test_set:
        # Simuleer LLM call (in echte versie: echte call naar Ollama)
        predicted = email["true_category"] if random.random() > 0.15 else random.choice(["order_status", "simple_question"])
        confidence = random.uniform(0.7, 0.98)

        if predicted == email["true_category"]:
            correct += 1
        if email["true_category"] in ["complaint", "return_request"] and confidence > 0.85:
            high_risk_correct += 1

    accuracy = correct / len(test_set)
    high_risk_accuracy = high_risk_correct / max(1, sum(1 for e in test_set if e["true_category"] in ["complaint", "return_request"]))

    return {
        "date": datetime.now().isoformat(),
        "model": model,
        "test_size": len(test_set),
        "overall_accuracy": round(accuracy * 100, 1),
        "high_risk_accuracy": round(high_risk_accuracy * 100, 1),
        "escalation_rate": round((1 - accuracy) * 100, 1),
        "recommendation": "Continue" if accuracy > 0.82 else "Retrain or adjust prompt"
    }

if __name__ == "__main__":
    result = run_eval()
    print(json.dumps(result, indent=2))
    # In productie: schrijf naar TimescaleDB + stuur alert als accuracy < 80%