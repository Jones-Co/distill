/**
 * Test Suite — AI Integration (Model-Agnostic)
 *
 * Tests provider configuration, payload building, response extraction,
 * and error handling. Does NOT call live APIs — tests the integration
 * logic only.
 *
 * Usage: node test/test-ai-integration.js
 */

const { SYSTEM_PROMPT, PROVIDERS, getFallbackResponse } = require('../src/ai-integration.js');

// ============================================================================
// TEST FRAMEWORK
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

function section(name) {
  console.log(`\n${name}`);
  console.log('-'.repeat(name.length));
}

// ============================================================================
// TEST DATA
// ============================================================================

const testMessages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'system', content: 'Knowledge base context here.' },
  { role: 'user', content: 'Tell me about your experience.' }
];

// ============================================================================
// TESTS: Provider Configuration
// ============================================================================

section('Provider Configuration');

assert(PROVIDERS.openai !== undefined, 'OpenAI provider exists');
assert(PROVIDERS.anthropic !== undefined, 'Anthropic provider exists');

assertEqual(
  PROVIDERS.openai.defaultModel,
  'gpt-3.5-turbo',
  'OpenAI defaults to gpt-3.5-turbo'
);

assertEqual(
  PROVIDERS.anthropic.defaultModel,
  'claude-haiku-4-5-20251001',
  'Anthropic defaults to claude-haiku-4-5'
);

assert(
  PROVIDERS.openai.apiUrl === 'https://api.openai.com/v1/chat/completions',
  'OpenAI API URL is correct'
);

assert(
  PROVIDERS.anthropic.apiUrl === 'https://api.anthropic.com/v1/messages',
  'Anthropic API URL is correct'
);

// ============================================================================
// TESTS: Auth Headers
// ============================================================================

section('Auth Headers');

assertEqual(
  PROVIDERS.openai.authHeader('sk-test123'),
  'Bearer sk-test123',
  'OpenAI uses Bearer token format'
);

assertEqual(
  PROVIDERS.anthropic.authHeader('sk-ant-test123'),
  'sk-ant-test123',
  'Anthropic returns raw key (used with x-api-key header)'
);

// ============================================================================
// TESTS: OpenAI Payload Building
// ============================================================================

section('OpenAI Payload Building');

const openaiPayload = PROVIDERS.openai.buildPayload(testMessages, 'gpt-3.5-turbo', 0.7, 500);

assertEqual(openaiPayload.model, 'gpt-3.5-turbo', 'sets model correctly');
assertEqual(openaiPayload.temperature, 0.7, 'sets temperature');
assertEqual(openaiPayload.max_tokens, 500, 'sets max_tokens');
assertEqual(openaiPayload.messages.length, 3, 'passes all messages (including system)');
assertEqual(openaiPayload.messages[0].role, 'system', 'keeps system messages in messages array');
assertEqual(openaiPayload.top_p, 1, 'includes top_p default');
assertEqual(openaiPayload.frequency_penalty, 0, 'includes frequency_penalty');
assertEqual(openaiPayload.presence_penalty, 0, 'includes presence_penalty');

// ============================================================================
// TESTS: Anthropic Payload Building
// ============================================================================

section('Anthropic Payload Building');

const anthropicPayload = PROVIDERS.anthropic.buildPayload(testMessages, 'claude-haiku-4-5-20251001', 0.7, 500);

assertEqual(anthropicPayload.model, 'claude-haiku-4-5-20251001', 'sets model correctly');
assertEqual(anthropicPayload.temperature, 0.7, 'sets temperature');
assertEqual(anthropicPayload.max_tokens, 500, 'sets max_tokens');

// Anthropic separates system messages
assert(
  typeof anthropicPayload.system === 'string',
  'extracts system messages into separate "system" field'
);
assert(
  anthropicPayload.system.includes('You are a helpful assistant.'),
  'system field contains first system message'
);
assert(
  anthropicPayload.system.includes('Knowledge base context here.'),
  'system field contains second system message'
);

// Non-system messages only in messages array
assertEqual(
  anthropicPayload.messages.length,
  1,
  'messages array only contains non-system messages'
);
assertEqual(
  anthropicPayload.messages[0].role,
  'user',
  'messages array contains the user message'
);

// ============================================================================
// TESTS: Response Extraction
// ============================================================================

section('Response Extraction');

// OpenAI response format
const openaiResponse = {
  choices: [{ message: { content: '  Hello from OpenAI  ' } }]
};
assertEqual(
  PROVIDERS.openai.extractResponse(openaiResponse),
  'Hello from OpenAI',
  'extracts and trims OpenAI response'
);

// Anthropic response format
const anthropicResponse = {
  content: [{ text: '  Hello from Claude  ' }]
};
assertEqual(
  PROVIDERS.anthropic.extractResponse(anthropicResponse),
  'Hello from Claude',
  'extracts and trims Anthropic response'
);

// ============================================================================
// TESTS: Error Handling in Response Extraction
// ============================================================================

section('Error Handling');

// OpenAI empty choices
let openaiError = false;
try {
  PROVIDERS.openai.extractResponse({ choices: [] });
} catch (e) {
  openaiError = true;
  assert(e.message.includes('No response from OpenAI'), 'OpenAI throws on empty choices');
}
assert(openaiError, 'OpenAI extractResponse throws on empty choices array');

// OpenAI missing choices
let openaiMissing = false;
try {
  PROVIDERS.openai.extractResponse({});
} catch (e) {
  openaiMissing = true;
}
assert(openaiMissing, 'OpenAI extractResponse throws on missing choices field');

// Anthropic empty content
let anthropicError = false;
try {
  PROVIDERS.anthropic.extractResponse({ content: [] });
} catch (e) {
  anthropicError = true;
  assert(e.message.includes('No response from Anthropic'), 'Anthropic throws on empty content');
}
assert(anthropicError, 'Anthropic extractResponse throws on empty content array');

// Anthropic missing content
let anthropicMissing = false;
try {
  PROVIDERS.anthropic.extractResponse({});
} catch (e) {
  anthropicMissing = true;
}
assert(anthropicMissing, 'Anthropic extractResponse throws on missing content field');

// ============================================================================
// TESTS: System Prompt & Fallback
// ============================================================================

section('System Prompt & Fallback');

assert(
  SYSTEM_PROMPT.includes('[YOUR NAME]'),
  'system prompt contains customization placeholder [YOUR NAME]'
);
assert(
  SYSTEM_PROMPT.includes('ONLY answer questions using the provided knowledge base'),
  'system prompt enforces knowledge-base-only responses'
);

const fallback = getFallbackResponse();
assert(
  typeof fallback === 'string' && fallback.length > 0,
  'fallback response returns a non-empty string'
);
assert(
  fallback.includes('try again') || fallback.includes('contact'),
  'fallback response suggests next steps'
);

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

section('Edge Cases');

// Anthropic with no system messages
const noSystemMessages = [{ role: 'user', content: 'Hello' }];
const noSystemPayload = PROVIDERS.anthropic.buildPayload(noSystemMessages, 'claude-haiku-4-5-20251001', 0.7, 500);
assertEqual(noSystemPayload.system, '', 'handles no system messages gracefully');
assertEqual(noSystemPayload.messages.length, 1, 'passes user message through');

// Anthropic with only system messages
const onlySystem = [{ role: 'system', content: 'System only' }];
const onlySystemPayload = PROVIDERS.anthropic.buildPayload(onlySystem, 'claude-haiku-4-5-20251001', 0.7, 500);
assertEqual(onlySystemPayload.system, 'System only', 'handles system-only messages');
assertEqual(onlySystemPayload.messages.length, 0, 'empty messages array when no user messages');

// OpenAI with custom model
const customPayload = PROVIDERS.openai.buildPayload(testMessages, 'gpt-4o', 0.5, 1000);
assertEqual(customPayload.model, 'gpt-4o', 'accepts custom model override');
assertEqual(customPayload.temperature, 0.5, 'accepts custom temperature');
assertEqual(customPayload.max_tokens, 1000, 'accepts custom max_tokens');

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
