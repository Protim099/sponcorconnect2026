/**
 * Prompt: Given a campaign caption, find matching event posts.
 */
module.exports = (campaignCaption, events) => {
  const candidateList = events.map(e => `- ID: ${e.id}, Caption: "${e.caption}"`).join('\n');
  return `You are a sponsorship matching assistant. Your job is to rank which event posts best match a given sponsor campaign.

CAMPAIGN CAPTION:
"${campaignCaption}"

CANDIDATE EVENTS:
${candidateList}

INSTRUCTIONS:
- Return ONLY a JSON array of objects with "id" (number) and "score" (0-100).
- Rank from best match to worst. Only include candidates with score >= 20.
- If no good match exists, return an empty array [].
- Do NOT invent IDs that are not in the candidate list.
- Do NOT include any explanation or text outside the JSON.

RESPONSE FORMAT (strict JSON only):
[{"id": 3, "score": 88}, {"id": 7, "score": 65}]`;
};
