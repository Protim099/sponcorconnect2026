/**
 * Prompt: Analyze reviews and return green or red flag.
 */
module.exports = (reviewTexts) => {
  const reviews = reviewTexts.map((r, i) => `Review ${i + 1}: "${r}"`).join('\n');
  return `You are a review analysis assistant. Analyze the following user reviews and determine if this user is trustworthy.

REVIEWS:
${reviews}

INSTRUCTIONS:
- If the overall sentiment is positive or neutral, respond with exactly: green
- If the overall sentiment is negative, concerning, or indicates untrustworthiness, respond with exactly: red
- Respond with ONLY one word: green or red
- No explanation, no punctuation, no extra text.`;
};
