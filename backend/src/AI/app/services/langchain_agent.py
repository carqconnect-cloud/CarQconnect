import os
import re
import time
import logging
from typing import Tuple, List, Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("ai_agent")

# In-memory query response cache (LRU style)
_QUERY_CACHE: Dict[str, Tuple[str, List[Dict[str, Any]]]] = {}
_MAX_CACHE_SIZE = 500

# ─────────────────────────────────────────────────────────────────────────────
# 1. PRE-COMPILED VERIFIED KNOWLEDGE BASE (INSTANT 0ms RESPONSES)
# ─────────────────────────────────────────────────────────────────────────────

INTENT_KNOWLEDGE_BASE = [
    {
        "id": "qr_tag",
        "patterns": [
            r"\b(link|activate|generate|create|get)\b.*\b(qr|tag|etag)\b",
            r"\b(qr|tag)\b.*\b(link|activate|generate|code|placement|where to place)\b",
            r"\bwhere\b.*\b(place|put|stick)\b.*\b(qr|tag)\b",
            r"\balready have.*tag\b",
        ],
        "keywords": ["qr", "tag", "etag", "qr tag", "activate qr", "link qr", "placement"],
        "answer": (
            "**FIONER / CarQ Smart QR Safety Tag Guide:**\n\n"
            "• **To Link an Existing Physical Tag:**\n"
            "  1. Open **My QR Tag** from the dashboard.\n"
            "  2. Select **'I Already Have A Tag'**.\n"
            "  3. Scan the QR code or enter the unique 6-8 character tag code to link it to your vehicle.\n\n"
            "• **To Generate & Activate a New Tag:**\n"
            "  1. Go to **My QR Tag** -> choose **Select Vehicle**.\n"
            "  2. Enter contact & emergency details (phone number, blood group, medical notes).\n"
            "  3. Configure privacy options (*Allow Masked Call, Allow Message, Show Emergency Contact*).\n"
            "  4. Tap **Save & Activate** to generate your unique Tag ID and download the digital eTag.\n\n"
            "• **Placement:** Place the QR tag clearly visible on the front windshield and passenger side of your vehicle."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "documents",
        "patterns": [
            r"\b(upload|add|manage|view|save|scan)\b.*\b(document|documents|rc|insurance|puc|license)\b",
            r"\b(document|documents|rc|insurance|puc|license)\b.*\b(upload|add|manage|view|save|scan|renew)\b",
            r"\bhow\b.*\b(upload|add)\b.*\b(rc|insurance|puc)\b",
        ],
        "keywords": ["document", "documents", "rc", "insurance", "puc", "license", "upload document", "add document"],
        "answer": (
            "**Vehicle Documents Management Guide:**\n\n"
            "1. Open **Documents** from the main dashboard.\n"
            "2. Tap **Add Document** (or the '+' button).\n"
            "3. Select the document type: **Registration Certificate (RC)**, **Insurance Policy**, **Pollution (PUC)**, or **Driving License**.\n"
            "4. Upload an image using your **Camera**, **Gallery**, or file picker.\n"
            "5. Enter the registration/policy number, issue date, and expiry date.\n"
            "6. Tap **Save Document**.\n\n"
            "*Tip: The app will automatically alert you before your Insurance or PUC expires so you never miss a renewal!*"
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "fastag",
        "patterns": [
            r"\b(recharge|add|buy|link|balance|transaction|toll)\b.*\bfastag\b",
            r"\bfastag\b.*\b(recharge|add|buy|link|balance|transaction|toll|receipt)\b",
        ],
        "keywords": ["fastag", "recharge", "add fastag", "toll", "recharge fastag", "fastag balance", "fastag transaction"],
        "answer": (
            "**FASTag Services & Recharge Guide:**\n\n"
            "• **Recharge FASTag:**\n"
            "  1. Open **FASTag** from the Home screen.\n"
            "  2. Select your linked vehicle/FASTag card.\n"
            "  3. Enter or select the recharge amount (e.g. ₹500, ₹1,000, ₹2,000).\n"
            "  4. Tap **Continue to Pay** and complete checkout via UPI, Cards, or Net Banking.\n\n"
            "• **Add a New FASTag:**\n"
            "  1. Tap **Add FASTag**.\n"
            "  2. Select your issuer bank (e.g. ICICI, Airtel Payments Bank, Paytm, SBI, Bank of Baroda).\n"
            "  3. Enter your vehicle registration number and save.\n\n"
            "• **Transactions & Tolls:** View all toll deductions, pass entries, and download official receipts under the **Transactions** tab."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "reminders",
        "patterns": [
            r"\b(set|add|create|manage|edit)\b.*\b(reminder|reminders|service|maintenance|puc|oil)\b",
            r"\b(reminder|reminders)\b.*\b(set|add|create|service|maintenance|puc|renewal)\b",
        ],
        "keywords": ["reminder", "reminders", "service reminder", "maintenance", "puc renewal", "insurance reminder"],
        "answer": (
            "**Vehicle Reminders Setup Guide:**\n\n"
            "1. Open **Reminders** from the dashboard.\n"
            "2. Tap **Add Reminder** (or '+' icon).\n"
            "3. Choose a reminder category:\n"
            "   • **Service & Maintenance** (periodic engine service, oil & filter change)\n"
            "   • **PUC Renewal** (pollution certificate expiry)\n"
            "   • **Insurance Renewal** (comprehensive / third-party policy)\n"
            "   • **Tyre & Battery Check** (rotation, wheel alignment, battery health)\n"
            "   • **Custom Reminder** (set your own custom title & notes)\n"
            "4. Select the target date, alert advance notice (e.g. 3 days before), and tap **Save Reminder**."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "gps_tracking",
        "patterns": [
            r"\b(gps|track|tracking|location|live location|geofence|geofencing|parking|find my car)\b",
            r"\bhow\b.*\b(track|locate)\b.*\b(vehicle|car|bike)\b",
        ],
        "keywords": ["gps", "track", "tracking", "live location", "geofence", "geofencing", "parking history"],
        "answer": (
            "**GPS Live Tracking & Geofencing Guide:**\n\n"
            "• **Live Location Tracking:**\n"
            "  1. Tap **Track** from the bottom bar or Home screen.\n"
            "  2. View real-time GPS location, speed, ignition status, and movement history on the live interactive map.\n\n"
            "• **Geofencing Setup:**\n"
            "  1. Go to **Track** -> **Geofence**.\n"
            "  2. Tap **Add Geofence**, select your location (Home, Office, Parking), and choose the safety radius (e.g. 500m).\n"
            "  3. Configure instant notifications for Entry, Exit, or both, then save.\n\n"
            "• **Parking History:** Check where and when your vehicle was parked with one-tap navigation back to your parking spot."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "sos_emergency",
        "patterns": [
            r"\b(sos|emergency|accident|help me|emergency contact|hold for sos|panic)\b",
        ],
        "keywords": ["sos", "emergency", "accident", "emergency contact", "panic button"],
        "answer": (
            "**FIONER SOS Emergency Assistance:**\n\n"
            "1. Tap the **SOS** button from the bottom navigation.\n"
            "2. **Press and hold the SOS button for 3 seconds** to trigger emergency mode.\n"
            "3. A 3-second countdown gives you time to cancel if pressed accidentally.\n"
            "4. Once activated, the system automatically:\n"
            "   • Dials your configured primary emergency contact immediately.\n"
            "   • Dispatches your real-time GPS coordinates via SMS / alert.\n"
            "   • Connects to FIONER Emergency 24/7 Roadside Support if requested."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "support_tickets",
        "patterns": [
            r"\b(support|ticket|raise ticket|help|contact support|chat support|customer care|complaint)\b",
        ],
        "keywords": ["support", "ticket", "raise ticket", "help & support", "contact support", "complaint"],
        "answer": (
            "**Help, Customer Care & Support Tickets:**\n\n"
            "1. Open **Profile** -> **Help & Support**.\n"
            "2. Tap **Raise Ticket**.\n"
            "3. Select your issue category (QR Tag, FASTag, Billing & Payments, GPS Hardware, Account).\n"
            "4. Enter a subject and detailed description, attach a screenshot if helpful, and tap **Submit**.\n"
            "5. You will receive an immediate Ticket Reference ID (e.g. `TIC-1002`) to monitor resolution progress in real time.\n"
            "6. You can also start a live chat or call support directly from the contact options."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "store_orders",
        "patterns": [
            r"\b(store|product|products|buy|order|cart|shop|dashcam|tracker)\b",
        ],
        "keywords": ["store", "products", "buy", "order", "cart", "dashcam", "gps tracker"],
        "answer": (
            "**FIONER Store & Automotive Accessories:**\n\n"
            "1. Tap **Store** from the bottom navigation.\n"
            "2. Browse categories: **Smart Dashcams**, **GPS Trackers**, **OBD-II Bluetooth Scanners**, and **FIONER Metal/PVC QR Tags**.\n"
            "3. Select any item to view specifications, user reviews, warranty, and seller info.\n"
            "4. Tap **Add to Cart** or **Buy Now**, choose your saved delivery address, and pay securely via Razorpay (UPI, Credit/Debit cards)."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "garage_obd",
        "patterns": [
            r"\b(garage|obd|scanner|diagnostic|dtc|health|engine light|battery voltage)\b",
        ],
        "keywords": ["garage", "obd", "scanner", "vehicle health", "diagnostics", "dtc"],
        "answer": (
            "**Garage & OBD-II Vehicle Diagnostics:**\n\n"
            "1. Open **Garage** from the bottom navigation.\n"
            "2. Plug in your FIONER OBD-II scanner into the car's diagnostic port (under the steering wheel) and pair via Bluetooth.\n"
            "3. Tap **Start Scan** to view real-time diagnostics:\n"
            "   • Engine status, coolant temperature, RPM, and fuel trim.\n"
            "   • Battery voltage health and alternator charging state.\n"
            "   • Diagnostic Trouble Codes (DTC) with plain-English problem explanations and repair guidance."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "plan_trip",
        "patterns": [
            r"\b(trip|plan trip|route|routes|navigation|toll estimate|stops)\b",
        ],
        "keywords": ["trip", "plan trip", "route", "navigation", "toll calculation"],
        "answer": (
            "**Trip Planning & Route Optimization:**\n\n"
            "1. Open **Plan Trip** from the Home screen.\n"
            "2. Enter your starting point and destination.\n"
            "3. Review smart route options (Fastest Route, Fuel Efficient, Avoid Tolls).\n"
            "4. Check estimated toll taxes, fuel cost, driving time, and verified highway amenities (restrooms, EV chargers, fuel stations) before starting navigation."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
    {
        "id": "membership",
        "patterns": [
            r"\b(membership|subscription|plan|plans|upgrade|premium|pro|benefits)\b",
        ],
        "keywords": ["membership", "subscription", "plans", "upgrade", "premium"],
        "answer": (
            "**Membership & Subscription Plans:**\n\n"
            "1. Open **Profile** -> **Membership Plan**.\n"
            "2. Choose between **Free**, **Silver**, and **Gold / Premium** tiers.\n"
            "3. Premium perks include:\n"
            "   • Unlimited document storage & cloud backup.\n"
            "   • Live 10-second GPS location refresh & geofence notifications.\n"
            "   • 24/7 Emergency Roadside Assistance (RSA).\n"
            "   • Free replacement QR tags and exclusive store discounts.\n"
            "4. Select monthly or yearly billing and activate instantly."
        ),
        "source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf",
    },
]

# Greetings
GREETING_PATTERN = re.compile(
    r"^(hi+|hello+|hey+|hola|namaste|greetings|good\s+(morning|afternoon|evening|day))(\s+(there|assistant|bot|friend|team))?[\s!.]*$",
    re.IGNORECASE,
)
CASUAL_PHRASES = {
    "who are you", "what can you do", "help", "how are you",
    "how are you doing", "whats up", "what's up", "thank you", "thanks",
    "bye", "goodbye", "ok", "okay"
}

def is_conversational_greeting(text: str) -> bool:
    clean = re.sub(r"[^\w\s]", "", text.strip().lower())
    if GREETING_PATTERN.match(text.strip()):
        return True
    if clean in CASUAL_PHRASES:
        return True
    return False

def get_instant_greeting(question: str) -> str:
    clean = re.sub(r"[^\w\s]", "", question.strip().lower())
    if clean in ("thank you", "thanks"):
        return "You're very welcome! Let me know if you need any more help with your vehicle or services. Have a great drive! 😊"
    if clean in ("bye", "goodbye"):
        return "Goodbye! Drive safe, and feel free to reach out whenever you need assistance."
    if clean in ("who are you", "what can you do", "help"):
        return (
            "Hello! I am your **CarQ / FIONER AI Assistant**. I can help you instantly with:\n\n"
            "• **QR Safety Tags**: Linking, activating, privacy, and vehicle placement.\n"
            "• **Vehicle Documents**: Adding & managing RC, Insurance, and PUC.\n"
            "• **FASTag**: Recharging, checking balance, and linking issuer banks.\n"
            "• **Reminders**: Scheduling service, maintenance, and renewal alerts.\n"
            "• **GPS Tracking**: Live location, geofencing, and parking history.\n"
            "• **Emergency & SOS**: Rapid alert dispatch to contacts.\n"
            "• **Help & Tickets**: Raising and tracking support tickets.\n\n"
            "How can I assist you today?"
        )
    return (
        "Hello! I am your **CarQ AI Assistant**. I'm here and ready to help you with your vehicle documents, "
        "FASTag recharge, QR safety tag, service reminders, or tracking. How can I assist you today?"
    )

def match_fast_intent(question: str) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
    q_lower = question.strip().lower()

    # 1. Regex pattern check
    for item in INTENT_KNOWLEDGE_BASE:
        for pattern in item["patterns"]:
            if re.search(pattern, q_lower):
                sources = [{"content": item["answer"], "metadata": {"source": item["source"], "intent": item["id"]}}]
                return item["answer"], sources

    # 2. Token overlap check for high precision
    tokens = set(re.findall(r"\w+", q_lower))
    best_item = None
    best_score = 0
    for item in INTENT_KNOWLEDGE_BASE:
        match_count = sum(1 for kw in item["keywords"] if kw in q_lower or any(t == kw for t in tokens))
        if match_count >= 2 and match_count > best_score:
            best_score = match_count
            best_item = item

    if best_item and best_score >= 2:
        sources = [{"content": best_item["answer"], "metadata": {"source": best_item["source"], "intent": best_item["id"]}}]
        return best_item["answer"], sources

    return None

# ─────────────────────────────────────────────────────────────────────────────
# 2. SINGLETON LLM PIPELINE (PRE-WARMED ONCE AT STARTUP)
# ─────────────────────────────────────────────────────────────────────────────
_SINGLETON_LLM = None

def get_llm():
    """Returns pre-warmed singleton LLM with fast, responsive model."""
    global _SINGLETON_LLM
    if _SINGLETON_LLM is not None:
        return _SINGLETON_LLM

    from langchain_google_genai import ChatGoogleGenerativeAI
    
    # gemini-2.5-flash is ultra-fast and handles reasoning accurately
    _SINGLETON_LLM = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
        google_api_key=settings.GEMINI_API_KEY,
    )
    return _SINGLETON_LLM

def ask_question(question: str, session_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Processes user query with instant response tiering."""
    q_clean = question.strip()
    if not q_clean:
        return "Please ask a question about your vehicle or FIONER services.", []

    cache_key = q_clean.lower()
    if cache_key in _QUERY_CACHE:
        logger.info(f"Instant cache hit for '{q_clean}'")
        return _QUERY_CACHE[cache_key]

    # Tier 1: Instant Greetings (<1ms)
    if is_conversational_greeting(q_clean):
        ans = get_instant_greeting(q_clean)
        _QUERY_CACHE[cache_key] = (ans, [])
        return ans, []

    # Tier 2: Instant Knowledge Base Match (<2ms)
    fast_match = match_fast_intent(q_clean)
    if fast_match:
        _QUERY_CACHE[cache_key] = fast_match
        return fast_match

    # Tier 3: Fast LLM generation for novel questions
    try:
        llm = get_llm()
        context_snippets = "\n\n".join(
            f"[{item['id'].upper()}]: {item['answer']}" for item in INTENT_KNOWLEDGE_BASE
        )
        prompt = (
            f"You are the FIONER / CarQ AI Assistant. Use the following verified product knowledge to answer concisely and helpfully:\n\n"
            f"{context_snippets}\n\n"
            f"User Question: {q_clean}\n\n"
            f"Helpful, structured Answer:"
        )
        res = llm.invoke(prompt)
        content = res.content
        if isinstance(content, list):
            content = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)

        sources = [{"content": "FIONER Knowledge Base v4.0", "metadata": {"source": "docs/FIONER_AI_Agent_Knowledge_Base_v4_RAG.pdf"}}]
        result = (content, sources)

        if len(_QUERY_CACHE) < _MAX_CACHE_SIZE:
            _QUERY_CACHE[cache_key] = result
        return result
    except Exception as e:
        logger.error(f"LLM fallback error: {e}")
        return (
            "I'm here to help with your vehicle, documents, FASTag, reminders, and QR safety tags. "
            "Please select a quick option or try asking again in a moment.",
            []
        )
