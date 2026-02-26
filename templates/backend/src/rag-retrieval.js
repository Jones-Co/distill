/**
 * RAG Retrieval System
 * Keyword-based retrieval from a JSONL knowledge base.
 * Scores entries by keyword matches across content, topic, title, tags, and questions.
 */

/**
 * Extract keywords from a user's question.
 * Removes stop words and short terms, returns meaningful search tokens.
 */
function extractKeywords(question) {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
    'from', 'has', 'he', 'she', 'in', 'is', 'it', 'its', 'of', 'on',
    'that', 'the', 'to', 'was', 'will', 'with', 'what', 'when',
    'where', 'who', 'how', 'does', 'did', 'can', 'could', 'would',
    'should', 'about', 'me', 'tell', 'you', 'your', 'my', 'i',
    'do', 'have', 'been', 'their', 'they', 'this', 'which', 'some'
  ]);

  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Score an individual knowledge base entry against extracted keywords.
 */
function scoreEntry(entry, keywords) {
  let score = 0;

  const content = (entry.content || entry.answer || '').toLowerCase();
  const topic = (entry.topic || '').toLowerCase();
  const title = (entry.title || '').toLowerCase();
  const tags = (entry.tags || []).map(t => t.toLowerCase());

  keywords.forEach(keyword => {
    if (content.includes(keyword)) score += 3;
    if (topic.includes(keyword)) score += 2;
    if (title.includes(keyword)) score += 2;
    if (tags.some(tag => tag.includes(keyword))) score += 1;
  });

  // Bonus: qa_pair entries get boosted when the question matches
  if (entry.type === 'qa_pair' && entry.question) {
    const questionLower = entry.question.toLowerCase();
    keywords.forEach(kw => {
      if (questionLower.includes(kw)) score += 5;
    });
  }

  // Small bonus for verified confidence
  if (entry.confidence === 'verified') score += 1;

  return score;
}

/**
 * Retrieve the top N most relevant entries for a given question.
 *
 * @param {string} question - The user's question
 * @param {Array} knowledgeBase - Parsed knowledge base entries
 * @param {number} topN - Number of entries to return (default: 5)
 * @returns {Array} Top N most relevant entries
 */
function retrieveEntries(question, knowledgeBase, topN = 5) {
  const keywords = extractKeywords(question);

  // If no meaningful keywords, return general overview entries
  if (keywords.length === 0) {
    return knowledgeBase
      .filter(e => e.type === 'narrative' && e.topic === 'about')
      .slice(0, topN);
  }

  const scored = knowledgeBase
    .map(entry => ({ entry, score: scoreEntry(entry, keywords) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map(item => item.entry);
}

/**
 * Format retrieved entries into a text block for injection into the AI prompt.
 */
function formatEntriesForContext(entries) {
  return entries.map((entry, index) => {
    let formatted = `[Entry ${index + 1}]\n`;
    formatted += `Type: ${entry.type}\n`;
    formatted += `Topic: ${entry.topic}\n`;

    if (entry.title) formatted += `Title: ${entry.title}\n`;

    if (entry.type === 'qa_pair') {
      formatted += `Question: ${entry.question}\n`;
      formatted += `Answer: ${entry.answer}\n`;
    } else {
      formatted += `Content: ${entry.content}\n`;
    }

    formatted += `Confidence: ${entry.confidence}\n`;
    formatted += `Tags: ${entry.tags.join(', ')}\n`;

    return formatted;
  }).join('\n---\n\n');
}

module.exports = {
  extractKeywords,
  scoreEntry,
  retrieveEntries,
  formatEntriesForContext
};
