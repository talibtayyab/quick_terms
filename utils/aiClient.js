// utils/aiClient.js

const GEMINI_API_KEY = 'AIzaSyAKdd15IhDWaXqWeWCyg3UY-jUpTVVwhdI'; // replace if you want real AI

/**
 * Main entry used by background.js
 * @param {string} text - full T&C text
 * @param {object} preferences - user preferences from storage
 */
export async function summarizeTermsAndCheck(text, preferences) {
  let base;
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      base = await callGeminiForSummary(text);
    } catch (err) {
      console.warn('Gemini summary failed, falling back to local summary:', err);
      base = localSummarize(text);
    }
  } else {
    base = localSummarize(text);
  }

  const compliance = evaluateCompliance(text, preferences);
  return {
    summary: base.summary,
    red_flags: base.red_flags,
    important_points: base.important_points,
    compliant: compliance.compliant,
    violations: compliance.violations
  };
}

/**
 * Explain a specific clause / sentence to the user
 */
export async function explainClause(clauseText) {
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      return await callGeminiForExplanation(clauseText);
    } catch (err) {
      console.warn('Gemini explanation failed, using local:', err);
      return localExplain(clauseText);
    }
  }
  return localExplain(clauseText);
}

/* ---------- Local (offline-ish) logic ---------- */

function localSummarize(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  return {
    summary:
      'This document outlines how the service operates, what data it collects, how that data may be shared, and your responsibilities as a user. Pay particular attention to sections on data sharing, dispute resolution, and account suspension.',
    red_flags: [
      'Look for sections where your data may be shared or sold to third parties.',
      'Check if there are arbitration clauses or waivers limiting your ability to sue.',
      'Watch for broad rights for the company to change terms at any time without clear notice.'
    ],
    important_points: [
      'What personal and behavioral data is collected and for what purposes.',
      'How long the company keeps your data and whether you can request deletion.',
      'Conditions under which your account can be suspended or terminated.'
    ]
  };
}

function localExplain(clauseText) {
  const cleaned = clauseText.replace(/\s+/g, ' ').trim();
  return (
    'Plain-language explanation (approximate): This clause is likely describing a legal or data-related condition. ' +
    'It may define what the company is allowed to do (for example with your data, your account, or legal disputes). ' +
    'Read it together with nearby paragraphs to understand whether it expands the company’s rights, limits your rights, or describes how your data is handled. ' +
    'Clause snippet: "' +
    cleaned.slice(0, 240) +
    (cleaned.length > 240 ? '…' : '"')
  );
}

/* ---------- Compliance check ---------- */

function evaluateCompliance(text, prefs) {
  const t = text.toLowerCase();
  const violations = [];

  // Data sharing check
  if (prefs.dataSharing === 'never') {
    if (t.includes('share') && (t.includes('third party') || t.includes('third parties'))) {
      violations.push(
        'Document mentions sharing your data with third parties, but your preference is "Never share data".'
      );
    }
  } else if (prefs.dataSharing === 'consent') {
    if (t.includes('third party') && !t.includes('consent')) {
      violations.push(
        'Data may be shared with third parties but consent is not clearly mentioned, while you prefer sharing only with consent.'
      );
    }
  }

  // Email sharing
  if (prefs.emailSharing === 'not_allowed') {
    if (
      t.includes('email') &&
      (t.includes('marketing') || t.includes('newsletter') || t.includes('promotional'))
    ) {
      violations.push(
        'Email may be used for marketing or newsletters, but you marked email-sharing as not allowed.'
      );
    }
  }

  // Location access
  if (prefs.locationAccess === 'never') {
    if (t.includes('location') || t.includes('geolocation')) {
      violations.push('The document refers to collecting or using your location, but you prefer "Never".');
    }
  } else if (prefs.locationAccess === 'while_using') {
    if (
      (t.includes('location') || t.includes('geolocation')) &&
      (t.includes('background') || t.includes('always'))
    ) {
      violations.push(
        'Location may be collected in the background or always-on, but your preference is "Only while using the service".'
      );
    }
  }

  // Custom categories
  (prefs.customCategories || []).forEach((cat) => {
    const labelLower = (cat.label || '').toLowerCase();
    if (!labelLower) return;

    const token = labelLower.split(' ')[0];
    if (!cat.allowed && t.includes(token)) {
      violations.push(
        `Document may contain terms related to "${cat.label}", which you marked as not allowed.`
      );
    }
  });

  return {
    compliant: violations.length === 0,
    violations
  };
}

/* ---------- Gemini calls (optional) ---------- */

async function callGeminiForSummary(text) {
  const endpoint =
    'https://generative.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  const prompt = `
You are summarizing a Terms & Conditions / Privacy Policy document.

1) Provide a concise 2-line summary.
2) List 3 key red flags.
3) List 3 important points that users might overlook.

Return ONLY JSON in this format:
{
  "summary": "two-line summary",
  "red_flags": ["...", "...", "..."],
  "important_points": ["...", "...", "..."]
}

Document text:
${text.slice(0, 12000)}
  `.trim();

  const res = await fetch(`${endpoint}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini summary error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = localSummarize(text);
  }

  return {
    summary: parsed.summary || '',
    red_flags: parsed.red_flags || [],
    important_points: parsed.important_points || []
  };
}

async function callGeminiForExplanation(clauseText) {
  const endpoint =
    'https://generative.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  const prompt = `
You are a legal explainer bot.

Explain the following clause in very simple, user-friendly language (3–5 sentences).
Avoid legal jargon.

Clause:
${clauseText}
  `.trim();

  const res = await fetch(`${endpoint}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini explanation error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return rawText || localExplain(clauseText);
}