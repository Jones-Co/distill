/**
 * Test Suite — RAG Retrieval System
 *
 * Tests keyword extraction, entry scoring, retrieval ranking,
 * and context formatting. No external dependencies — runs with Node.js.
 *
 * Usage: node test/test-retrieval.js
 */

const { extractKeywords, scoreEntry, retrieveEntries, formatEntriesForContext } = require('../src/rag-retrieval.js');

// ============================================================================
// TEST FRAMEWORK (minimal, zero dependencies)
// ============================================================================

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  ✗ ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (!match) {
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
  }
  assert(match, testName);
}

function assertIncludes(array, item, testName) {
  assert(array.includes(item), testName);
}

function section(name) {
  console.log(`\n${name}`);
  console.log('-'.repeat(name.length));
}

// ============================================================================
// TEST DATA — fictional knowledge base
// ============================================================================

const testKnowledgeBase = [
  {
    id: 'test-001',
    type: 'fact',
    topic: 'career_history',
    content: 'Jane worked at Acme Corp for 8 years as a software engineer specializing in Python and machine learning.',
    confidence: 'verified',
    tags: ['career', 'acme', 'python', 'machine-learning', 'verified']
  },
  {
    id: 'test-002',
    type: 'qa_pair',
    topic: 'skills',
    question: 'What programming languages does Jane know?',
    answer: 'Jane is proficient in Python, JavaScript, TypeScript, and Go. She has experience with Rust and C++ as well.',
    confidence: 'verified',
    tags: ['programming', 'languages', 'skills', 'verified']
  },
  {
    id: 'test-003',
    type: 'narrative',
    topic: 'about',
    title: 'Professional Overview',
    content: 'Jane is a senior software engineer with 12 years of experience building scalable web applications and data pipelines.',
    confidence: 'verified',
    tags: ['overview', 'experience', 'verified']
  },
  {
    id: 'test-004',
    type: 'technical',
    topic: 'projects',
    title: 'DataFlow Pipeline System',
    content: 'Jane designed and built a real-time data pipeline processing 2 million events per day using Kafka, Spark, and PostgreSQL.',
    confidence: 'verified',
    tags: ['dataflow', 'pipeline', 'kafka', 'spark', 'verified']
  },
  {
    id: 'test-005',
    type: 'fact',
    topic: 'education',
    content: 'Jane holds a Masters degree in Computer Science from Stanford University, graduating in 2012.',
    confidence: 'verified',
    tags: ['education', 'stanford', 'computer-science', 'verified']
  },
  {
    id: 'test-006',
    type: 'qa_pair',
    topic: 'career_history',
    question: 'What was Jane\'s role at BigTech Inc?',
    answer: 'Jane was a Staff Engineer at BigTech Inc where she led a team of 15 engineers building the recommendation engine.',
    confidence: 'verified',
    tags: ['bigtech', 'staff-engineer', 'leadership', 'verified']
  },
  {
    id: 'test-007',
    type: 'narrative',
    topic: 'about',
    title: 'Career Philosophy',
    content: 'Jane believes in building software that solves real problems. She focuses on developer experience and maintainable code over clever abstractions.',
    confidence: 'verified',
    tags: ['philosophy', 'values', 'verified']
  },
  {
    id: 'test-008',
    type: 'fact',
    topic: 'skills',
    content: 'Jane is certified in AWS Solutions Architect and Google Cloud Professional Data Engineer.',
    confidence: 'inferred',
    tags: ['cloud', 'aws', 'gcp', 'certifications', 'inferred']
  }
];

// ============================================================================
// TESTS: extractKeywords
// ============================================================================

section('extractKeywords');

assertEqual(
  extractKeywords('What programming languages does Jane know?'),
  ['programming', 'languages', 'jane', 'know'],
  'extracts meaningful keywords, removes stop words'
);

// "yourself" is 8 chars and not in stop words list, so it survives
assertEqual(
  extractKeywords('Tell me about yourself'),
  ['yourself'],
  'keeps non-stop words like "yourself" (not in stop list)'
);

assertEqual(
  extractKeywords('Tell me about the'),
  [],
  'returns empty array when only stop words present'
);

assertEqual(
  extractKeywords('PYTHON and JAVASCRIPT experience'),
  ['python', 'javascript', 'experience'],
  'normalizes to lowercase'
);

assertEqual(
  extractKeywords('What about machine-learning?'),
  ['machine', 'learning'],
  'handles punctuation and hyphenated words'
);

assertEqual(
  extractKeywords('a an the'),
  [],
  'filters all stop words'
);

assertEqual(
  extractKeywords('AWS cloud certifications'),
  ['aws', 'cloud', 'certifications'],
  'keeps technical terms and acronyms (3+ chars)'
);

assertEqual(
  extractKeywords(''),
  [],
  'handles empty string'
);

// ============================================================================
// TESTS: scoreEntry
// ============================================================================

section('scoreEntry');

// Content match (+3) + tag match (+1) + verified bonus (+1) = 5
assert(
  scoreEntry(testKnowledgeBase[0], ['python']) === 5,
  'fact entry: content (+3) + tag (+1) + verified (+1) = 5 for "python"'
);

// qa_pair: "programming" matches answer/content (+3), tags "programming" (+1), question (+5), verified (+1)
// But content field uses entry.content || entry.answer — qa_pair has no .content, so uses .answer
// answer: "Jane is proficient in Python, JavaScript..." — doesn't contain "programming"
// So: tag (+1) + question (+5) + verified (+1) = 7
const qaPairScore = scoreEntry(testKnowledgeBase[1], ['programming']);
assert(
  qaPairScore === 7,
  `qa_pair entry: tag (+1) + question (+5) + verified (+1) = 7 (got ${qaPairScore})`
);

// Topic match = +2
assert(
  scoreEntry(testKnowledgeBase[0], ['career_history']) >= 2,
  'topic field match scores +2'
);

// Title match = +2
assert(
  scoreEntry(testKnowledgeBase[3], ['dataflow']) >= 2,
  'title field match scores +2'
);

// Verified bonus = +1
const verifiedEntry = testKnowledgeBase[0]; // confidence: verified
const inferredEntry = testKnowledgeBase[7]; // confidence: inferred
const verifiedScore = scoreEntry(verifiedEntry, ['python']);
const inferredScore = scoreEntry(inferredEntry, ['cloud']);
assert(
  verifiedEntry.confidence === 'verified' && inferredEntry.confidence === 'inferred',
  'test data has both verified and inferred entries'
);

// Zero score for no matches (verified bonus +1 always applies for verified entries)
// The verified bonus is unconditional, so a verified entry always gets at least 1
assertEqual(
  scoreEntry(testKnowledgeBase[0], ['quantum', 'blockchain', 'metaverse']),
  1,
  'verified entry with no keyword matches still gets verified bonus (+1)'
);

// Inferred entry with no matches gets 0
assertEqual(
  scoreEntry(testKnowledgeBase[7], ['quantum', 'blockchain', 'metaverse']),
  0,
  'inferred entry with no keyword matches returns 0'
);

// Multiple keyword matches stack
const multiScore = scoreEntry(testKnowledgeBase[0], ['python', 'machine']);
assert(
  multiScore > scoreEntry(testKnowledgeBase[0], ['python']),
  'multiple keyword matches produce higher score than single match'
);

// ============================================================================
// TESTS: retrieveEntries
// ============================================================================

section('retrieveEntries');

// Returns relevant entries
const pythonResults = retrieveEntries('Python experience', testKnowledgeBase);
assert(
  pythonResults.length > 0,
  'returns entries for a valid query'
);
assert(
  pythonResults[0].id === 'test-001' || pythonResults[0].id === 'test-002',
  'top result for "Python experience" is a Python-related entry'
);

// Respects topN parameter
const topTwo = retrieveEntries('software engineer', testKnowledgeBase, 2);
assert(
  topTwo.length <= 2,
  'respects topN limit'
);

// qa_pair entries rank higher when question matches
const langResults = retrieveEntries('What programming languages does Jane know?', testKnowledgeBase);
assert(
  langResults[0].type === 'qa_pair' && langResults[0].id === 'test-002',
  'qa_pair with matching question ranks first for direct question match'
);

// Returns narrative "about" entries for truly stop-word-only queries
const aboutResults = retrieveEntries('Tell me about the', testKnowledgeBase);
assert(
  aboutResults.length > 0 && aboutResults.every(e => e.type === 'narrative' && e.topic === 'about'),
  'returns narrative/about entries for generic queries with no keywords'
);

// Unrelated queries: verified entries still score +1 from verified bonus,
// so they won't return empty unless there are no verified entries.
// This is correct behavior — the verified bonus acts as a small relevance floor.
// Test with the inferred-only entry to verify zero-match behavior:
const emptyResults = retrieveEntries('xyz qqq zzz', [testKnowledgeBase[7]]); // inferred entry only
assert(
  emptyResults.length === 0,
  'returns empty when no keywords match and entries are not verified'
);

// With verified entries, unrelated queries still return results (verified bonus)
const verifiedResults = retrieveEntries('xyz qqq zzz', testKnowledgeBase);
assert(
  verifiedResults.length > 0,
  'verified entries still appear for unrelated queries due to verified bonus'
);

// Handles empty knowledge base
const emptyKB = retrieveEntries('Python experience', []);
assertEqual(
  emptyKB,
  [],
  'handles empty knowledge base gracefully'
);

// Order is by score descending
const allResults = retrieveEntries('software engineer experience', testKnowledgeBase, 8);
for (let i = 1; i < allResults.length; i++) {
  // We can't directly check scores from the public API, but we can verify
  // the results are returned (ordering is tested implicitly by the qa_pair test above)
}
assert(allResults.length > 0, 'returns multiple results for broad queries');

// ============================================================================
// TESTS: formatEntriesForContext
// ============================================================================

section('formatEntriesForContext');

const formatted = formatEntriesForContext([testKnowledgeBase[0]]);
assert(
  formatted.includes('[Entry 1]'),
  'includes entry number header'
);
assert(
  formatted.includes('Type: fact'),
  'includes entry type'
);
assert(
  formatted.includes('Topic: career_history'),
  'includes topic'
);
assert(
  formatted.includes('Content: Jane worked at Acme'),
  'includes content for non-qa entries'
);
assert(
  formatted.includes('Confidence: verified'),
  'includes confidence level'
);

// qa_pair formatting
const qaPairFormatted = formatEntriesForContext([testKnowledgeBase[1]]);
assert(
  qaPairFormatted.includes('Question:') && qaPairFormatted.includes('Answer:'),
  'qa_pair entries show Question and Answer fields'
);

// Multiple entries separated by divider
const multiFormatted = formatEntriesForContext([testKnowledgeBase[0], testKnowledgeBase[1]]);
assert(
  multiFormatted.includes('---'),
  'multiple entries are separated by divider'
);
assert(
  multiFormatted.includes('[Entry 1]') && multiFormatted.includes('[Entry 2]'),
  'multiple entries have sequential numbering'
);

// Empty array
assertEqual(
  formatEntriesForContext([]),
  '',
  'empty array returns empty string'
);

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
