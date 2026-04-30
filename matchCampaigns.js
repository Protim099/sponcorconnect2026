/**
 * Prompt: Given an event post caption, find matching campaigns.
 * @param {string} eventCaption
 * @param {Array<{id: number, caption: string}>} campaigns
 * @returns {string}
 */
module.exports = (eventCaption, campaigns) => {
  const candidatesJson = JSON.stringify(
    campaigns.map(c => ({
      id: c.id,
      caption: c.caption
    })),
    null,
    2
  );

  return `You are a sponsorship matching assistant.

Your task:
Given one event caption and a list of candidate sponsor campaigns, return the best matching campaigns.

Rules:
- Use ONLY the candidate IDs provided in the candidates list.
- Do NOT invent any new IDs.
- Output ONLY raw JSON.
- Do NOT return markdown.
- Do NOT wrap the response in \`\`\`.
- Do NOT explain anything.
- Return a JSON array.
- Each item must have:
  - "id": number
  - "score": number from 0 to 100
- Rank results from highest score to lowest score.
- Include only candidates with score >= 65.
- If no candidate is relevant, return [].

Event:
${JSON.stringify({ caption: eventCaption }, null, 2)}

Candidate campaigns:
${candidatesJson}

Return only JSON array.`;
};