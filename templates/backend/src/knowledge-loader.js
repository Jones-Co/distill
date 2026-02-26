/**
 * Knowledge Base Loader
 * Converts knowledge.jsonl into a JavaScript module that Cloudflare Workers can import.
 *
 * Run this before deploying:
 *   node src/knowledge-loader.js
 */

const fs = require('fs');
const path = require('path');

function generateKnowledgeModule() {
  const jsonlPath = path.join(__dirname, '..', 'knowledge.jsonl');

  if (!fs.existsSync(jsonlPath)) {
    console.error('Error: knowledge.jsonl not found at', jsonlPath);
    console.error('Place your JSONL knowledge base file in the backend root directory.');
    process.exit(1);
  }

  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n');
  const entries = [];

  lines.forEach((line, index) => {
    try {
      entries.push(JSON.parse(line));
    } catch (e) {
      console.error(`Warning: Invalid JSON on line ${index + 1}, skipping: ${e.message}`);
    }
  });

  // Count types and topics for stats
  const typeCounts = {};
  const topicCounts = {};
  entries.forEach(entry => {
    typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    topicCounts[entry.topic] = (topicCounts[entry.topic] || 0) + 1;
  });

  return `// Auto-generated knowledge base module
// Generated: ${new Date().toISOString()}
// Entries: ${entries.length}

const knowledgeBase = ${JSON.stringify(entries, null, 2)};

function getKnowledgeBase() {
  return knowledgeBase;
}

const stats = {
  totalEntries: ${entries.length},
  types: ${JSON.stringify(typeCounts)},
  topics: ${JSON.stringify(topicCounts)}
};

module.exports = { knowledgeBase, getKnowledgeBase, stats };
`;
}

if (require.main === module) {
  const output = generateKnowledgeModule();
  const outputPath = path.join(__dirname, 'knowledge-data.js');
  fs.writeFileSync(outputPath, output);
  console.log(`Knowledge base module generated: ${outputPath}`);
  console.log(`Entries loaded: ${output.match(/totalEntries: (\d+)/)[1]}`);
}

module.exports = { generateKnowledgeModule };
