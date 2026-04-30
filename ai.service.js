/**
 * AI Service — communicates with LM Studio (OpenAI-compatible API)
 */
const matchCampaignsPrompt = require('../prompts/matchCampaigns');
const matchEventsPrompt = require('../prompts/matchEvents');
const reviewFlagPrompt = require('../prompts/reviewFlag');

const LM_BASE = () => process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';
const LM_MODEL = () => process.env.LM_STUDIO_MODEL || 'local-model';

/**
 * Call LM Studio chat completions endpoint
 */
async function callLM(prompt) {
  const url = `${LM_BASE()}/chat/completions`;
  const body = {
    model: LM_MODEL(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2048,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LM Studio error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Parse JSON from LM response with fallback
 */
function safeParseJSON(text) {
  // Try to extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

/**
 * Validate matched IDs — only allow IDs from the candidate list
 */
function validateMatchResult(parsed, validIds, minScore = 65) {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(item => {
      return (
        item &&
        typeof item.id === 'number' &&
        validIds.includes(item.id) &&
        typeof item.score === 'number' &&
        item.score >= minScore
      );
    })
    .map(item => ({
      id: item.id,
      score: Math.min(100, Math.max(0, item.score)),
    }));
}

/**
 * Match campaigns for a given event post
 */
async function matchCampaignsForEvent(eventCaption, campaigns) {
  const prompt = matchCampaignsPrompt(eventCaption, campaigns);

  console.log("===== MATCH CAMPAIGNS PROMPT START =====");
  console.log(prompt);
  console.log("===== MATCH CAMPAIGNS PROMPT END =====");

  const raw = await callLM(prompt);

  console.log("===== LM RAW RESPONSE START =====");
  console.log(raw);
  console.log("===== LM RAW RESPONSE END =====");

  const parsed = safeParseJSON(raw);

  console.log("===== LM PARSED RESPONSE =====");
  console.log(parsed);

  const validIds = campaigns.map(c => c.id);
  const validated = validateMatchResult(parsed, validIds, 65);

  console.log("===== LM VALIDATED RESULT =====");
  console.log(validated);

  return validated;
}
/**
 * Match event posts for a given campaign
 */
async function matchEventsForCampaign(campaignCaption, events) {
  const prompt = matchEventsPrompt(campaignCaption, events);
  const raw = await callLM(prompt);
  const parsed = safeParseJSON(raw);
  const validIds = events.map(e => e.id);
  return validateMatchResult(parsed, validIds);
}

/**
 * Analyze reviews and return 'green' or 'red'
 */
async function analyzeReviewFlag(reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) return 'green'; // no reviews = neutral
  const prompt = reviewFlagPrompt(reviewTexts);
  const raw = await callLM(prompt);
  const cleaned = raw.toLowerCase().trim();
  if (cleaned === 'green' || cleaned === 'red') return cleaned;
  // Fallback: check if response contains the word
  if (cleaned.includes('red')) return 'red';
  if (cleaned.includes('green')) return 'green';
  return 'green'; // safe fallback
}

module.exports = { matchCampaignsForEvent, matchEventsForCampaign, analyzeReviewFlag };
