#!/usr/bin/env node

/**
 * Knowledge Base Validator
 *
 * Validates a JSONL knowledge base file against the schema specification.
 * Reports errors, warnings, and summary statistics.
 *
 * Usage:
 *   node validate.js path/to/knowledge.jsonl
 *   node validate.js path/to/knowledge.jsonl --strict
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---

const VALID_TYPES = ['fact', 'narrative', 'qa_pair', 'technical', 'fit_assessment'];
const VALID_CONFIDENCE = ['verified', 'inferred', 'approximate'];
const VALID_FIT_TYPES = ['good_fit', 'not_ideal', 'red_flag'];
const ID_PATTERN = /^rag-\d{4}-\d{2}-\d{2}-\d{3}$/;

// --- Validation ---

function validateEntry(entry, lineNumber) {
  const errors = [];
  const warnings = [];

  // Required fields (all types)
  if (!entry.id) {
    errors.push('Missing required field: id');
  } else if (!ID_PATTERN.test(entry.id)) {
    errors.push(`Invalid id format: "${entry.id}" (expected: rag-YYYY-MM-DD-###)`);
  }

  if (!entry.type) {
    errors.push('Missing required field: type');
  } else if (!VALID_TYPES.includes(entry.type)) {
    errors.push(`Invalid type: "${entry.type}" (expected: ${VALID_TYPES.join(', ')})`);
  }

  if (!entry.topic) {
    errors.push('Missing required field: topic');
  } else if (entry.topic !== entry.topic.toLowerCase() || entry.topic.includes(' ')) {
    warnings.push(`Topic "${entry.topic}" should be snake_case`);
  }

  if (!entry.confidence) {
    errors.push('Missing required field: confidence');
  } else if (!VALID_CONFIDENCE.includes(entry.confidence)) {
    errors.push(`Invalid confidence: "${entry.confidence}" (expected: ${VALID_CONFIDENCE.join(', ')})`);
  }

  if (!entry.source) {
    errors.push('Missing required field: source');
  }

  if (!entry.tags) {
    errors.push('Missing required field: tags');
  } else if (!Array.isArray(entry.tags)) {
    errors.push('tags must be an array');
  } else if (entry.tags.length === 0) {
    errors.push('tags array must not be empty');
  } else {
    // Check for confidence tag
    if (entry.confidence && !entry.tags.includes(entry.confidence)) {
      warnings.push(`tags should include confidence level "${entry.confidence}"`);
    }
    // Check snake_case
    entry.tags.forEach(tag => {
      if (tag !== tag.toLowerCase() || tag.includes(' ')) {
        warnings.push(`Tag "${tag}" should be snake_case`);
      }
    });
  }

  // Type-specific validation
  if (entry.type === 'fact' || entry.type === 'narrative' || entry.type === 'technical') {
    if (!entry.content || entry.content.trim() === '') {
      errors.push(`Missing required field for ${entry.type}: content`);
    }
  }

  if (entry.type === 'narrative' || entry.type === 'technical') {
    if (!entry.title) {
      warnings.push(`${entry.type} entries should have a title field (used in retrieval scoring)`);
    }
  }

  if (entry.type === 'qa_pair') {
    if (!entry.question || entry.question.trim() === '') {
      errors.push('Missing required field for qa_pair: question');
    }
    if (!entry.answer || entry.answer.trim() === '') {
      errors.push('Missing required field for qa_pair: answer');
    }
  }

  if (entry.type === 'fit_assessment') {
    if (!entry.fit_type) {
      errors.push('Missing required field for fit_assessment: fit_type');
    } else if (!VALID_FIT_TYPES.includes(entry.fit_type)) {
      errors.push(`Invalid fit_type: "${entry.fit_type}" (expected: ${VALID_FIT_TYPES.join(', ')})`);
    }
    if (!entry.criteria) {
      errors.push('Missing required field for fit_assessment: criteria');
    }
    if (!entry.explanation) {
      errors.push('Missing required field for fit_assessment: explanation');
    }
  }

  // Content quality warnings
  const content = entry.content || entry.answer || '';
  if (content.length > 0 && content.length < 20) {
    warnings.push('Content is very short (< 20 chars) — may not be useful for retrieval');
  }
  if (entry.type === 'narrative' && content.length < 100) {
    warnings.push('Narrative content is short (< 100 chars) — narratives should tell a story');
  }

  return { errors, warnings };
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node validate.js <path-to-knowledge.jsonl> [--strict]');
    console.log('');
    console.log('Options:');
    console.log('  --strict    Treat warnings as errors');
    console.log('  --stats     Show only statistics, no individual issues');
    console.log('  --help      Show this help message');
    process.exit(0);
  }

  const filePath = args[0];
  const strict = args.includes('--strict');
  const statsOnly = args.includes('--stats');

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  let totalErrors = 0;
  let totalWarnings = 0;
  const ids = new Set();
  const duplicateIds = [];
  const typeCounts = {};
  const topicCounts = {};
  const confidenceCounts = {};

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let entry;

    // Parse JSON
    try {
      entry = JSON.parse(line);
    } catch (e) {
      if (!statsOnly) {
        console.error(`Line ${lineNumber}: PARSE ERROR — Invalid JSON: ${e.message}`);
      }
      totalErrors++;
      return;
    }

    // Check for duplicate IDs
    if (entry.id) {
      if (ids.has(entry.id)) {
        duplicateIds.push({ id: entry.id, line: lineNumber });
      }
      ids.add(entry.id);
    }

    // Count types, topics, confidence
    if (entry.type) typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    if (entry.topic) topicCounts[entry.topic] = (topicCounts[entry.topic] || 0) + 1;
    if (entry.confidence) confidenceCounts[entry.confidence] = (confidenceCounts[entry.confidence] || 0) + 1;

    // Validate
    const { errors, warnings } = validateEntry(entry, lineNumber);

    if (!statsOnly) {
      errors.forEach(err => {
        console.error(`Line ${lineNumber} (${entry.id || 'no id'}): ERROR — ${err}`);
      });
      warnings.forEach(warn => {
        const level = strict ? 'ERROR' : 'WARNING';
        console.warn(`Line ${lineNumber} (${entry.id || 'no id'}): ${level} — ${warn}`);
      });
    }

    totalErrors += errors.length;
    if (strict) {
      totalErrors += warnings.length;
    } else {
      totalWarnings += warnings.length;
    }
  });

  // Report duplicate IDs
  duplicateIds.forEach(({ id, line }) => {
    if (!statsOnly) {
      console.error(`Line ${line}: ERROR — Duplicate id: "${id}"`);
    }
    totalErrors++;
  });

  // Summary
  console.log('');
  console.log('=== Knowledge Base Summary ===');
  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Total entries: ${lines.length}`);
  console.log(`Unique IDs: ${ids.size}`);
  console.log('');

  console.log('By type:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = ((count / lines.length) * 100).toFixed(0);
      console.log(`  ${type}: ${count} (${pct}%)`);
    });
  console.log('');

  console.log('By topic:');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`  ${topic}: ${count}`);
    });
  console.log('');

  console.log('By confidence:');
  Object.entries(confidenceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([conf, count]) => {
      const pct = ((count / lines.length) * 100).toFixed(0);
      console.log(`  ${conf}: ${count} (${pct}%)`);
    });
  console.log('');

  // Coverage assessment
  const coverageNote = lines.length < 30
    ? 'Below minimum viable (30+ entries recommended)'
    : lines.length < 80
      ? 'Basic coverage — interview sessions can deepen this significantly'
      : lines.length < 150
        ? 'Good coverage — consider targeted gap-filling'
        : 'Comprehensive coverage';
  console.log(`Coverage: ${coverageNote}`);
  console.log('');

  // Result
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('Result: VALID — No issues found');
  } else if (totalErrors === 0) {
    console.log(`Result: VALID with ${totalWarnings} warning(s)`);
  } else {
    console.log(`Result: INVALID — ${totalErrors} error(s), ${totalWarnings} warning(s)`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
