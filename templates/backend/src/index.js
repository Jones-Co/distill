/**
 * RAG Chatbot Backend — Cloudflare Worker
 *
 * Routes:
 *   POST /chat    — Main chat endpoint (RAG retrieval + AI response)
 *   GET  /health  — Health check
 *
 * CUSTOMIZE:
 *   1. Update ALLOWED_ORIGINS with your domain(s)
 *   2. Update NO_MATCH_RESPONSE and SUGGESTIONS with your content
 *   3. Set your AI_PROVIDER ('openai' or 'anthropic') and API key as Workers secrets
 *
 * AI PROVIDER SETUP:
 *   For OpenAI:    wrangler secret put OPENAI_API_KEY
 *   For Anthropic: wrangler secret put ANTHROPIC_API_KEY
 *   Set provider:  wrangler secret put AI_PROVIDER   (value: 'openai' or 'anthropic')
 */

const { retrieveEntries, formatEntriesForContext } = require('./rag-retrieval');
const { generateResponse, getFallbackResponse } = require('./ai-integration');
const { checkRateLimit, getSessionId, getClientIP } = require('./rate-limiter');
const { getKnowledgeBase, stats } = require('./knowledge-data');

// Load knowledge base at startup (cached across requests)
const knowledgeBase = getKnowledgeBase();

// ============================================================================
// CONFIGURATION — CUSTOMIZE THESE
// ============================================================================

const ALLOWED_ORIGINS = [
  // CUSTOMIZE: Add your domain(s) here
  'https://yoursite.com',
  'https://www.yoursite.com',
  'http://localhost:3000',
  'http://localhost:8000'
];

const NO_MATCH_RESPONSE = "I don't have information about that in my knowledge base. Is there something else I can help you with?";

const DEFAULT_SUGGESTIONS = [
  // CUSTOMIZE: Add 2-3 suggested follow-up questions
  "What can you tell me about [YOUR NAME]?",
  "What services are available?",
  "How can I get in touch?"
];

// ============================================================================
// CORS
// ============================================================================

function getCorsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin?.startsWith(allowed));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================================================
// CHAT HANDLER
// ============================================================================

async function handleChat(request, env) {
  const origin = request.headers.get('Origin');

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Please provide a message.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
      });
    }

    // Rate limiting
    const sessionId = getSessionId(request);
    const ipAddress = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sessionId, ipAddress, env.RATE_LIMIT);

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        error: rateLimitResult.reason,
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter.toString(),
          ...getCorsHeaders(origin)
        }
      });
    }

    // RAG retrieval
    const ragStart = Date.now();
    const retrievedEntries = retrieveEntries(message, knowledgeBase, 5);
    const ragTimeMs = Date.now() - ragStart;

    // No matches — return fallback
    if (retrievedEntries.length === 0) {
      return new Response(JSON.stringify({
        message: NO_MATCH_RESPONSE,
        suggestions: DEFAULT_SUGGESTIONS,
        metadata: { retrievalTime: ragTimeMs, entriesFound: 0 }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
      });
    }

    // Generate AI response
    const ragContext = formatEntriesForContext(retrievedEntries);
    const aiStart = Date.now();
    let aiResponse;

    // Determine provider and API key
    const provider = (env.AI_PROVIDER || 'openai').toLowerCase();
    const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

    try {
      aiResponse = await generateResponse(message, ragContext, apiKey, {
        provider,
        model: env.AI_MODEL || undefined  // Uses provider default if not set
      });
    } catch (error) {
      console.error('AI generation failed:', error);
      aiResponse = getFallbackResponse();
    }

    const aiTimeMs = Date.now() - aiStart;

    return new Response(JSON.stringify({
      message: aiResponse,
      suggestions: DEFAULT_SUGGESTIONS,
      metadata: {
        retrievalTime: ragTimeMs,
        aiGenerationTime: aiTimeMs,
        totalTime: ragTimeMs + aiTimeMs,
        entriesFound: retrievedEntries.length,
        topics: [...new Set(retrievedEntries.map(e => e.topic))]
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });

  } catch (error) {
    console.error('Request handler error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error. Please try again.',
      message: getFallbackResponse()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }
}

// ============================================================================
// ROUTER
// ============================================================================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }

  // Health check
  if (request.method === 'GET' && url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      entries: stats.totalEntries,
      types: stats.types,
      provider: env.AI_PROVIDER || 'openai',
      model: env.AI_MODEL || 'default'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }

  // Chat endpoint
  if (request.method === 'POST' && url.pathname === '/chat') {
    return handleChat(request, env);
  }

  return new Response('Not Found', { status: 404, headers: getCorsHeaders(origin) });
}

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
