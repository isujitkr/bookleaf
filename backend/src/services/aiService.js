const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY is not set. AI features will return fallback values.",
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "missing");

const triageModel = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: {
    maxOutputTokens: 120, 
    temperature: 0.1, 
    responseMimeType: "application/json",
  },
});

const draftModel = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: {
    maxOutputTokens: 600,
    temperature: 0.4, 
  },
});

const AI_ERRORS = {
  UNAVAILABLE: "AI_UNAVAILABLE",
  RATE_LIMITED: "AI_RATE_LIMITED",
  INVALID_RESPONSE: "AI_INVALID_RESPONSE",
  KEY_MISSING: "AI_KEY_MISSING",
};

function classifyError(err) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "missing") {
    return AI_ERRORS.KEY_MISSING;
  }
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return AI_ERRORS.RATE_LIMITED;
  if (err instanceof SyntaxError) return AI_ERRORS.INVALID_RESPONSE;
  return AI_ERRORS.UNAVAILABLE;
}

const KNOWLEDGE_BASE = `
BOOKLEAF PUBLISHING — SUPPORT KNOWLEDGE BASE

COMPANY
-BookLeaf Publishing is a self-publishing company operating in India and the US. 
-We offer publishing packages: Standard Free (no upfront cost) and Bestseller Breakthrough
(premium, paid package with marketing and distribution add-ons).
-We handle cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
-In-house printing and warehouse: Delhi. Print partners: Repro India, Epitome Books.

ROYALTY POLICY
- Split: 80% net profit to author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping.
- Royalties calculated quarterly; paid within 45 days of quarter end.
- Minimum payout threshold: ₹1,000. Below this, rolls over to next quarter.
- Payout via bank transfer to the account linked in the author's dashboard.
- Authors can view per-platform sales breakdown in their dashboard.

ISBN POLICY
- Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.
- ISBNs are registered under BookLeaf’s publisher imprint. If an author wants an ISBN under their
own imprint, they need to obtain it independently.
- ISBN errors (duplicate, wrong book linked) are high-priority — escalated to production immediately.

PRINTING & QUALITY
- In-house printing handles most orders. Overflow or specific format requirements go to Repro India
or Epitome Books.
- Standard turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, colour inconsistency): author shares photos → BookLeaf arranges free reprint after verification.

DISTRIBUTION & AVAILABILITY
- Platforms: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
- New listings go live within 7–10 business days after publication.
- "Currently Unavailable" on a platform = stock sync issue → re-sync triggered within 24–48 hours.

PRODUCTION STAGES
-Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live
-Authors emailed at each stage. Common delays: Cover Design (waiting on author approval), Proofreading (revision rounds).

METADATA UPDATES
- Post-publication metadata changes submitted via dashboard or email.
- Reflect on platforms within 3–5 business days.

COMMUNICATION TONE
- Empathetic and professional. Authors are partners, not customers.
- Acknowledge the concern before solutions.
- Be specific: use real numbers, dates, statuses — no vague reassurances.
- If BookLeaf is at fault, own it directly. No corporate deflection.
- Escalations: give a concrete timeline ("within 48 hours"), never open-ended.
- Always end with a clear next step.
`.trim();

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

async function processTicketWithAI(subject, description) {
  const prompt = `You are a support ticket triage system for BookLeaf, a book publishing company.

Analyse the ticket and return ONLY a JSON object — no markdown, no explanation.

Categories (pick exactly one):
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Priority rules:
- Critical: royalty unpaid for multiple months, account access lost, legal/financial risk
- High: book unavailable for sale, ISBN mismatch, significant production delay (>2 weeks overdue)
- Medium: quality complaints, metadata changes, active distribution queries
- Low: general questions, informational, bio/profile updates

Ticket Subject: "${subject}"
Ticket Description: "${description}"

Return this exact JSON shape:
{
  "category": "<one of the categories above>",
  "confidence": <0.0 to 1.0>,
  "priority": "<Critical|High|Medium|Low>",
  "priority_reasoning": "<one concise sentence>"
}`;

  try {
    const result = await triageModel.generateContent(prompt);
    const text = result.response.text().trim();

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);

    if (!CATEGORIES.includes(parsed.category))
      parsed.category = "General Inquiry";
    if (!PRIORITIES.includes(parsed.priority)) parsed.priority = "Medium";
    parsed.confidence = Math.min(
      1,
      Math.max(0, Number(parsed.confidence) || 0),
    );

    return {
      category: parsed.category,
      category_confidence: parsed.confidence,
      priority: parsed.priority,
      priority_reasoning: parsed.priority_reasoning || "",
      ai_error: null,
    };
  } catch (err) {
    const errorType = classifyError(err);
    console.error(
      `[aiService] processTicketWithAI failed (${errorType}):`,
      err.message,
    );
    return {
      category: "General Inquiry",
      category_confidence: 0,
      priority: "Medium",
      priority_reasoning: "Auto-classification unavailable.",
      ai_error: errorType,
    };
  }
}

async function generateDraftResponse(ticket) {
  const ticketContext = [
    `Author Name: ${ticket.author_name}`,
    `Category: ${ticket.category}`,
    `Priority: ${ticket.priority}`,
    `Subject: ${ticket.subject}`,
    `Description: ${ticket.description}`,
    ticket.book_title ? `Related Book: ${ticket.book_title}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const modelWithSystem = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    systemInstruction: `You are a support representative at BookLeaf Publishing.
You write empathetic, professional responses to author support tickets.
You always:
- Acknowledge the author's concern in the first sentence
- Reference specific BookLeaf policies (timelines, amounts, procedures) from the knowledge base
- Give a concrete next step or resolution timeline
- Sign off as "BookLeaf Support Team"
- Keep responses between 120–220 words
- Never use placeholder text like [NAME] or [DATE]
- Never make up data not present in the ticket or knowledge base`,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
  });

  const prompt = `Using the BookLeaf knowledge base below, write a support response for this ticket.

--- BOOKLEAF KNOWLEDGE BASE ---
${KNOWLEDGE_BASE}
--- END KNOWLEDGE BASE ---

--- TICKET ---
${ticketContext}
--- END TICKET ---

Write the response now:`;

  try {
    const result = await modelWithSystem.generateContent(prompt);
    return {
      draft: result.response.text().trim(),
      ai_error: null,
    };
  } catch (err) {
    const errorType = classifyError(err);
    console.error(
      `[aiService] generateDraftResponse failed (${errorType}):`,
      err.message,
    );
    return { draft: null, ai_error: errorType };
  }
}

module.exports = { processTicketWithAI, generateDraftResponse, AI_ERRORS };
