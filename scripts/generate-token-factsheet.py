#!/usr/bin/env python3
"""Generate LOOP Token Fact Sheet PDF with Loop brand styling."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Brand colours
BLACK = HexColor("#0A0A0A")
BG = HexColor("#080C14")
RED = HexColor("#E8173A")
GREEN = HexColor("#4ADE80")
GOLD = HexColor("#D4A843")
TEXT_DARK = HexColor("#1a1a1a")
TEXT_MID = HexColor("#4a4a4a")
TEXT_LIGHT = HexColor("#737373")
WHITE = HexColor("#FFFFFF")
BORDER = HexColor("#e5e5e5")
SECTION_BG = HexColor("#f8f8f8")

OUTPUT = os.path.join(os.path.dirname(__file__), "loop-token-factsheet.pdf")

def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=25*mm,
        rightMargin=25*mm,
        topMargin=30*mm,
        bottomMargin=25*mm,
        title="LOOP Token Fact Sheet",
        author="Loop TGP",
    )

    # Styles
    s_title = ParagraphStyle(
        "Title", fontName="Helvetica-Bold", fontSize=28,
        textColor=TEXT_DARK, leading=34, spaceAfter=4,
        tracking=-0.02,
    )
    s_subtitle = ParagraphStyle(
        "Subtitle", fontName="Helvetica", fontSize=11,
        textColor=TEXT_LIGHT, leading=16, spaceAfter=2,
    )
    s_section = ParagraphStyle(
        "Section", fontName="Helvetica-Bold", fontSize=14,
        textColor=TEXT_DARK, leading=20, spaceBefore=20, spaceAfter=8,
        tracking=-0.01,
    )
    s_body = ParagraphStyle(
        "Body", fontName="Helvetica", fontSize=9.5,
        textColor=TEXT_MID, leading=15, spaceAfter=6,
    )
    s_body_bold = ParagraphStyle(
        "BodyBold", fontName="Helvetica-Bold", fontSize=9.5,
        textColor=TEXT_DARK, leading=15, spaceAfter=6,
    )
    s_mono = ParagraphStyle(
        "Mono", fontName="Courier", fontSize=8,
        textColor=TEXT_DARK, leading=12, spaceAfter=4,
    )
    s_small = ParagraphStyle(
        "Small", fontName="Helvetica", fontSize=8,
        textColor=TEXT_LIGHT, leading=12, spaceAfter=4,
    )
    s_footer = ParagraphStyle(
        "Footer", fontName="Helvetica", fontSize=7.5,
        textColor=TEXT_LIGHT, leading=11, spaceBefore=16,
    )

    def table_style():
        return TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_DARK),
            ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_MID),
            ("BACKGROUND", (0, 0), (-1, 0), SECTION_BG),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, BORDER),
            ("LINEBELOW", (0, 1), (-1, -2), 0.25, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])

    def kv_table_style():
        return TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), TEXT_DARK),
            ("TEXTCOLOR", (1, 0), (1, -1), TEXT_MID),
            ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])

    W = doc.width
    elements = []

    # Red accent line at top
    elements.append(HRFlowable(
        width="100%", thickness=3, color=RED,
        spaceBefore=0, spaceAfter=12,
    ))

    # Title block
    elements.append(Paragraph("LOOP Token", s_title))
    elements.append(Paragraph("Fact Sheet", ParagraphStyle(
        "TitleSub", fontName="Helvetica", fontSize=22,
        textColor=TEXT_LIGHT, leading=28, spaceAfter=8,
    )))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Prepared for liquidity providers and bridge partners", s_subtitle))
    elements.append(Paragraph("20 July 2026", s_subtitle))

    elements.append(Spacer(1, 12))
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=BORDER,
        spaceBefore=0, spaceAfter=16,
    ))

    # Contract Details
    elements.append(Paragraph("Contract Details", s_section))
    contract_data = [
        ["Token name", "Loop Utility Token"],
        ["Symbol", "LOOP"],
        ["Standard", "ERC-20"],
        ["Decimals", "18"],
        ["Chain", "Base L2 (Coinbase), Chain ID 8453"],
        ["Contract address", "0xb8B309BBD007143cbef1844b75C1Fd038a267F21"],
        ["Owner address", "0xDB113f65d3368e5C0379486755fc3Fc0b7fB97cE"],
        ["Basescan", "basescan.org/token/0xb8B309BBD007143cbef1844b75C1Fd038a267F21"],
        ["Compiler", "Solidity v0.8.24, Optimization enabled (200 runs)"],
        ["EVM version", "Paris"],
        ["Contract name", "LoopToken"],
        ["Built on", "OpenZeppelin (Ownable, ERC20, Pausable)"],
        ["Source verified", "Yes, on Basescan (Standard Json-Input format)"],
        ["Bytecode", "5,785 bytes (direct deployment, not a proxy)"],
        ["Audit", "Built on audited OpenZeppelin contracts. Standalone audit pending."],
    ]
    t = Table(contract_data, colWidths=[W*0.3, W*0.7])
    t.setStyle(kv_table_style())
    elements.append(t)

    # Supply Model
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Supply Model", s_section))
    supply_data = [
        ["Initial target supply", "1,000,000,000 (1B) LOOP"],
        ["Current total supply", "0 (mint-on-purchase model)"],
        ["Supply type", "Inflationary, mint-on-demand"],
        ["Hard cap", "None"],
    ]
    t = Table(supply_data, colWidths=[W*0.3, W*0.7])
    t.setStyle(kv_table_style())
    elements.append(t)
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "Tokens are minted when purchased. There is no pre-minted supply. "
        "Additional supply growth comes from two sources:",
        s_body
    ))
    elements.append(Paragraph(
        "<b>1. Business enrolment:</b> businesses joining the Loop governance platform "
        "trigger new token minting, adding both tokens and liquidity to the ecosystem.",
        s_body
    ))
    elements.append(Paragraph(
        "<b>2. Fund structure:</b> assets held within the Loop fund structure back further "
        "token issuance, creating an asset-linked expansion model rather than uncapped inflation.",
        s_body
    ))

    # Pricing
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Pricing", s_section))
    pricing_data = [
        ["Method", "Price"],
        ["On-chain (ETH)", "0.0004 ETH per token"],
        ["Card (USD)", "$1.00 per token"],
        ["Card (GBP)", "£0.80 per token"],
        ["Card (EUR)", "€0.90 per token"],
    ]
    t = Table(pricing_data, colWidths=[W*0.35, W*0.65])
    t.setStyle(table_style())
    elements.append(t)

    # Tokenomics
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Tokenomics", s_section))
    elements.append(Paragraph(
        "For every token purchased, the contract mints a total of 2x tokens:",
        s_body
    ))
    tokenomics_data = [
        ["Allocation", "Amount", "Purpose"],
        ["Buyer", "1.0x", "Sent to the purchaser's wallet"],
        ["Impact Treasury", "0.5x", "Funds community governance projects"],
        ["Allocation Pot", "0.5x", "Distributed as governance participation rewards"],
        ["Total minted", "2.0x", ""],
    ]
    t = Table(tokenomics_data, colWidths=[W*0.25, W*0.15, W*0.6])
    ts = table_style()
    ts.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
    ts.add("LINEABOVE", (0, -1), (-1, -1), 0.5, BORDER)
    t.setStyle(ts)
    elements.append(t)
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        "Example: a purchase of 100 LOOP results in 200 LOOP being minted: "
        "100 to the buyer, 50 to the Impact Treasury, and 50 to the Allocation Pot.",
        s_small
    ))

    # Contract Functions
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Contract Functions", s_section))

    elements.append(Paragraph("Public", s_body_bold))
    elements.append(Paragraph(
        "<b>purchase(uint256 amount)</b> payable: buy tokens with ETH. "
        "Requires amount x pricePerToken as msg.value.",
        s_body
    ))
    elements.append(Paragraph(
        "<b>pricePerToken()</b> view: returns the current price per token in wei "
        "(400000000000000 = 0.0004 ETH).",
        s_body
    ))

    elements.append(Paragraph("Owner only", s_body_bold))
    elements.append(Paragraph(
        "<b>mint(address to, uint256 amount)</b>: mint tokens to a specified address "
        "(used for card purchase fulfilment from Ledger wallet).",
        s_body
    ))
    elements.append(Paragraph(
        "<b>pause() / unpause()</b>: emergency pause mechanism.",
        s_body
    ))
    elements.append(Paragraph(
        "<b>transferOwnership(address)</b>: transfer contract ownership.",
        s_body
    ))

    elements.append(Paragraph("Events", s_body_bold))
    elements.append(Paragraph(
        "<b>AllocationDirected</b>(address from, bytes32 communityId, uint256 amount): "
        "emitted when tokens are directed to a community.",
        s_body
    ))
    elements.append(Paragraph(
        "<b>CommunityWalletSet</b>(bytes32 communityId, address wallet): "
        "emitted when a community wallet is configured.",
        s_body
    ))

    # Platform
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Platform", s_section))
    platform_data = [
        ["Platform", "Loop_cmbntr"],
        ["Website", "gov.loopcmbntr.live"],
        ["Console", "console.loopcmbntr.live"],
        ["Entity", "Loop TGP"],
        ["Purpose", "Utility token for global governance platform"],
        ["Use cases", "Voting weight, delegation, community participation, earnings distribution"],
        ["Classification", "Utility token. Not a security."],
    ]
    t = Table(platform_data, colWidths=[W*0.3, W*0.7])
    t.setStyle(kv_table_style())
    elements.append(t)

    # Liquidity Requirements
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Liquidity Requirements", s_section))
    elements.append(Paragraph(
        "We are seeking a liquidity bridge partner to provide trading liquidity "
        "for LOOP on Base L2.",
        s_body
    ))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Preferred pairs:</b> LOOP/ETH, LOOP/USDC", s_body))
    elements.append(Paragraph("<b>Contact:</b> samuel@loopinc.live", s_body))

    # Footer
    elements.append(Spacer(1, 16))
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=BORDER,
        spaceBefore=0, spaceAfter=8,
    ))
    elements.append(Paragraph(
        "This document is provided for informational purposes to prospective liquidity partners. "
        "LOOP is a utility token on the Loop_cmbntr governance platform deployed on "
        "Coinbase's Base L2 network.",
        s_footer
    ))

    # Page decoration
    def on_page(canvas, doc):
        canvas.saveState()
        # Red stripe at top
        canvas.setFillColor(RED)
        canvas.rect(0, A4[1] - 8*mm, A4[0], 3*mm, fill=True, stroke=False)
        # Footer
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TEXT_LIGHT)
        canvas.drawString(25*mm, 12*mm, "Loop TGP")
        canvas.drawRightString(A4[0] - 25*mm, 12*mm, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    print(f"Generated: {OUTPUT}")

if __name__ == "__main__":
    build()
