#!/usr/bin/env python3
"""
AETHER Merchant Co-Ownership Tokens (Sprint 5)
Interne equity-like tokens voor top merchants (Fase 4)
"""

from typing import Dict, List
import json
from datetime import datetime

class MerchantCoOwnership:
    def __init__(self):
        self.tokens = {}  # merchant_id -> token_balance
        self.total_supply = 100_000_000  # 100M tokens
        self.distributed = 0

    def issue_tokens(self, merchant_id: str, contribution_score: float) -> Dict:
        """
        Geef tokens aan merchants op basis van hun bijdrage aan het ecosysteem.
        Bijv. uplift gegenereerd, data gedeeld (anonymized), referrals, etc.
        """
        tokens_to_issue = int(contribution_score * 1000)  # Simpele formule
        
        if self.distributed + tokens_to_issue > self.total_supply:
            tokens_to_issue = self.total_supply - self.distributed
        
        self.tokens[merchant_id] = self.tokens.get(merchant_id, 0) + tokens_to_issue
        self.distributed += tokens_to_issue
        
        return {
            "merchant_id": merchant_id,
            "tokens_issued": tokens_to_issue,
            "total_balance": self.tokens[merchant_id],
            "ownership_percentage": round((self.tokens[merchant_id] / self.total_supply) * 100, 4),
            "timestamp": datetime.now().isoformat()
        }

    def get_dividends(self, merchant_id: str, period_revenue: float) -> float:
        """
        Simuleer dividend uitkering (pro-rata op basis van tokens).
        In echte versie: smart contract op blockchain of interne settlement.
        """
        if merchant_id not in self.tokens:
            return 0.0
        
        ownership = self.tokens[merchant_id] / self.total_supply
        dividend = ownership * period_revenue * 0.15  # 15% van revenue naar token holders
        return round(dividend, 2)

if __name__ == "__main__":
    co = MerchantCoOwnership()
    issuance = co.issue_tokens("merchant_top_001", 47.3)  # Hoge contributor
    print(json.dumps(issuance, indent=2))
    
    dividend = co.get_dividends("merchant_top_001", 2_400_000)  # €2.4M revenue periode
    print(f"\nDividend uitkering: €{dividend}")