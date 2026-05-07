from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os

# Colors - AETHER dark tech theme
DARK_BG = HexColor("#0a0a0f")
ACCENT_BLUE = HexColor("#00d4ff")
ACCENT_PURPLE = HexColor("#7c3aed")
TEXT_LIGHT = HexColor("#e0e0e0")
TEXT_MUTED = HexColor("#888888")

def create_onepager():
    output_path = "/home/workdir/artifacts/AETHER_Investor_OnePager_v1.1.pdf"
    
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    # Background
    c.setFillColor(DARK_BG)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # Header bar
    c.setFillColor(HexColor("#111118"))
    c.rect(0, height - 2.8*cm, width, 2.8*cm, fill=1, stroke=0)
    
    # Logo placeholder (use one of the generated images)
    logo_path = "/home/workdir/artifacts/imagine_images/1HdES.jpg"
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 1.5*cm, height - 2.5*cm, width=2*cm, height=2*cm, mask='auto')
    
    # Title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(4*cm, height - 1.8*cm, "AETHER v1.1")
    
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica", 10)
    c.drawString(4*cm, height - 2.4*cm, "The World's First Self-Evolving AI E-commerce Organism")
    
    # Date
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 1.5*cm, height - 1.2*cm, "5 mei 2026  |  Seed Round €2.5-3.5M")
    
    y = height - 3.5*cm
    
    # Problem section
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5*cm, y, "HET PROBLEEM")
    y -= 0.5*cm
    
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 8)
    problem_text = [
        "95%+ van nieuwe e-commerce platformen faalt of levert marginale verbeteringen.",
        "Merchants verliezen 12-20 uur/week aan handmatige admin, email en leveranciers.",
        "Bestaande tools straffen groei af met 2-3% transactiekosten. AI is nooit het DNA."
    ]
    for line in problem_text:
        c.drawString(1.5*cm, y, line)
        y -= 0.4*cm
    
    y -= 0.3*cm
    
    # Solution
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5*cm, y, "DE OPLOSSING — AETHER")
    y -= 0.5*cm
    
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1.5*cm, y, "Binnen 60 seconden een volledig geoptimaliseerde webshop live — met AI die 24/7 autonoom:")
    y -= 0.45*cm
    
    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_LIGHT)
    features = [
        "• AETHER Mail — 70%+ emails autonoom afgehandeld (lokale LLM, zero leakage)",
        "• Supplier Intelligence — 85%+ accurate prijs/voorraad sync via veilige sandbox",
        "• AI-Native Admin — Natuurlijke taal commando's + 50% minder backend tijd"
    ]
    for f in features:
        c.drawString(1.5*cm, y, f)
        y -= 0.38*cm
    
    y -= 0.3*cm
    
    # USPs
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1.5*cm, y, "UNIEKE SELLING POINTS")
    y -= 0.4*cm
    
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 8)
    usps = ["0% Transactiekosten", "Success-based 12-15% van extra omzet", "Local AI First (air-gapped)", "Volledige Merchant Vrijheid"]
    x = 1.5*cm
    for usp in usps:
        c.drawString(x, y, "✓ " + usp)
        x += 4.2*cm
    y -= 0.6*cm
    
    # Roadmap table
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1.5*cm, y, "ROADMAP & TRACTION")
    y -= 0.5*cm
    
    # Simple table
    data = [
        ["Fase", "Periode", "Doel", "GMV", "Merchants"],
        ["0", "Q2-Q3 2026", "Foundation + 100 pilots", "-", "100"],
        ["1", "Q4 2026 - Q1 2027", "AI Brain + Mail + Supplier", "€50M", "5.000"],
        ["2", "2027", "Global Scale + Hive Mind", "€2B", "50.000"],
        ["3-4", "2028-2029", "Radical Autonomy → Dominance", "€100B+", "1M+"]
    ]
    
    table = Table(data, colWidths=[1.2*cm, 3*cm, 5.5*cm, 2.5*cm, 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor("#1a1a22")),
        ('TEXTCOLOR', (0, 0), (-1, 0), ACCENT_BLUE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#333340")),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor("#111118")),
    ]))
    
    table_width, table_height = table.wrap(0, 0)
    table.drawOn(c, 1.5*cm, y - table_height)
    y -= table_height + 0.5*cm
    
    # Business Model
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1.5*cm, y, "BUSINESS MODEL")
    y -= 0.4*cm
    
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 8)
    c.drawString(1.5*cm, y, "Freemium → Pro €99/maand | Success fee 12-15% van extra omzet | 0% platform fees")
    y -= 0.35*cm
    c.drawString(1.5*cm, y, "Projectie Fase 2: +15-25% uplift | Churn <8% | LTV:CAC > 8:1")
    y -= 0.6*cm
    
    # Ask
    c.setFillColor(HexColor("#22c55e"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.5*cm, y, "DE ASK — SEED 2026: €2.5 – 3.5M")
    y -= 0.45*cm
    
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 8)
    c.drawString(1.5*cm, y, "60% Team (AI + Engineering)  |  25% Lokale GPU infra & security  |  15% Marketing & pilots")
    y -= 0.5*cm
    
    # Why now & Exit
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1.5*cm, y, "Waarom nu? ")
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 8)
    c.drawString(4.2*cm, y, "MedusaJS 2.x volwassen + lokale LLMs production-ready + merchants eisen autonomie.")
    y -= 0.4*cm
    
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1.5*cm, y, "Exit: ")
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 8)
    c.drawString(2.8*cm, y, "Strategische overname (Adobe/Salesforce/Stripe) of IPO 2029+ (€100B+ GMV)")
    y -= 0.7*cm
    
    # Footer
    c.setFillColor(HexColor("#1a1a22"))
    c.rect(0, 0, width, 1.8*cm, fill=1, stroke=0)
    
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width/2, 1.1*cm, "AETHER — Merchant Success First. Local AI First. Niets is onmogelijk.")
    
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 7)
    c.drawCentredString(width/2, 0.6*cm, "Steve Meerschaut  •  Gent, België  •  steve@aether.com  •  github.com/Steve-Mee/Aether")
    
    c.save()
    print(f"PDF created: {output_path}")

if __name__ == "__main__":
    create_onepager()
