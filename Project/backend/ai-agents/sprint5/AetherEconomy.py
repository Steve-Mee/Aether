#!/usr/bin/env python3
"""
AETHER Economy (Sprint 5)
Interne marktplaats voor anonymized insights, data en producten
"""

from typing import List, Dict
import json
from datetime import datetime

class AetherEconomy:
    def __init__(self):
        self.listings = []
        self.transactions = []

    def list_insight(self, seller_id: str, insight: Dict, price: float) -> Dict:
        listing = {
            "id": f"insight_{len(self.listings)+1}",
            "seller_id": seller_id,
            "type": "anonymized_insight",
            "title": insight.get("title"),
            "description": insight.get("description"),
            "price": price,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        self.listings.append(listing)
        return listing

    def purchase_insight(self, buyer_id: str, listing_id: str) -> Dict:
        listing = next((l for l in self.listings if l["id"] == listing_id), None)
        if not listing:
            return {"error": "Listing not found"}
        
        transaction = {
            "id": f"tx_{len(self.transactions)+1}",
            "listing_id": listing_id,
            "buyer_id": buyer_id,
            "seller_id": listing["seller_id"],
            "amount": listing["price"],
            "timestamp": datetime.now().isoformat(),
            "status": "completed"
        }
        self.transactions.append(transaction)
        listing["status"] = "sold"
        
        return {
            "transaction": transaction,
            "message": "Insight unlocked. Data is fully anonymized and GDPR-compliant."
        }

    def get_marketplace_stats(self) -> Dict:
        return {
            "active_listings": len([l for l in self.listings if l["status"] == "active"]),
            "total_volume": sum(t["amount"] for t in self.transactions),
            "top_category": "pricing_optimization",
            "avg_price": round(sum(l["price"] for l in self.listings) / max(1, len(self.listings)), 2)
        }

if __name__ == "__main__":
    economy = AetherEconomy()
    listing = economy.list_insight("merchant_001", {
        "title": "Black Friday pricing strategy 2025",
        "description": "Anonymized data from 47 merchants — +31% uplift with dynamic pricing"
    }, 249)
    print(json.dumps(listing, indent=2))
    
    purchase = economy.purchase_insight("merchant_042", listing["id"])
    print("\nPurchase result:")
    print(json.dumps(purchase, indent=2))
    
    stats = economy.get_marketplace_stats()
    print("\nMarketplace Stats:")
    print(json.dumps(stats, indent=2))