#!/usr/bin/env python3
"""
AETHER Full Agentic Commerce (Sprint 6)
Klanten shoppen via AI-agents die namens hen onderhandelen (Fase 4)
"""

from typing import Dict, List
import json
from datetime import datetime

class CustomerAgent:
    def __init__(self, customer_profile: Dict):
        self.profile = customer_profile  # budget, preferences, style, etc.

    def negotiate(self, product: Dict, merchant_agent) -> Dict:
        """Onderhandel met merchant agent."""
        offer = {
            "product_id": product["id"],
            "initial_price": product["price"],
            "customer_max": self.profile.get("max_budget", product["price"] * 0.9),
            "style_match": self.profile.get("style", "streetwear") in product.get("tags", [])
        }
        
        # Simuleer onderhandeling
        final_price = min(offer["initial_price"], offer["customer_max"])
        discount = round((offer["initial_price"] - final_price) / offer["initial_price"] * 100, 1)
        
        return {
            "status": "deal" if final_price <= offer["customer_max"] else "no_deal",
            "final_price": final_price,
            "discount": f"{discount}%",
            "reason": "Style match + budget alignment" if offer["style_match"] else "Price too high"
        }

class MerchantAgent:
    def __init__(self, margin_target: float = 0.35):
        self.margin_target = margin_target

    def respond_to_offer(self, offer: Dict) -> Dict:
        """Antwoord op klant aanbod."""
        if offer["final_price"] >= offer["initial_price"] * 0.85:
            return {"status": "accepted", "message": "Deal accepted. Thank you!"}
        else:
            return {"status": "counter", "new_price": offer["initial_price"] * 0.92, "message": "Can do 8% off."}

if __name__ == "__main__":
    customer = CustomerAgent({"max_budget": 75, "style": "streetwear"})
    merchant = MerchantAgent()
    
    product = {"id": "limited_hoodie", "price": 89, "tags": ["streetwear", "sustainable"]}
    
    negotiation = customer.negotiate(product, merchant)
    response = merchant.respond_to_offer(negotiation)
    
    print("Agentic Commerce Negotiation:")
    print(json.dumps({"customer_offer": negotiation, "merchant_response": response}, indent=2))