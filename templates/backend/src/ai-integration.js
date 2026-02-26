/**
 * AI Integration — Model-Agnostic
 *
 * Supports both OpenAI and Anthropic (Claude) APIs for response generation.
 * Set the provider via the AI_PROVIDER environment variable or options parameter.
 *
 * RECOMMENDED SETUP:
 *   - Use Claude for building the knowledge base (structured JSONL output)
 *   - Use OpenAI for serving chatbot responses (cost-effective for high volume)
 *
 * CUSTOMIZE: Update the SYSTEM_PROMPT with your name and context.
 */

// ============================================================================
// SYSTEM PROMPT — CUSTOMIZE THIS
// ============================================================================

const SYSTEM_PROMPT = `You are an AI assistant for [YOUR NAME], helping visitors learn about their work, experience, and expertise.

CRITICAL RULES:
1. ONLY answer questions using the provided knowledge base entries
2. If information isn't in the knowledge base, say "I don't have that information in my knowledge base"
3. Be professional but approachable
4. Keep responses concise (2-3 paragraphs maximum)
5. Always offer a helpful next step
6. Be honest about limitations — don't guess or make up information

TONE:
- Professional but conversational
- Direct and helpful
- No unnecessary fluff
- Action-oriented

CONVERSATION ENDINGS:
Always conclude with a helpful next step, such as:
- Suggesting they contact [YOUR NAME] directly
- Offering to answer another question
- Pointing them toward a specific page or resource

Remember: You represent [YOUR NAME]'s professional brand. Be helpful, honest, and stick to the knowledge base.`;

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

const PROVIDERS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
    authHeader: (key) => `Bearer ${key}`,
    buildPayload: (messages, model, temperature, maxTokens) => ({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    }),
    extractResponse: (data) => {
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }
      return data.choices[0].message.content.trim();
    }
  },

  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5-20251001',
    authHeader: (key) => key, // Anthropic uses x-api-key header, not Bearer
    buildPayload: (messages, model, temperature, maxTokens) => {
      // Anthropic separates system from messages
      const systemMessages = messages.filter(m => m.role === 'system');
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      const systemText = systemMessages.map(m => m.content).join('\n\n');

      return {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemText,
        messages: nonSystemMessages
      };
    },
    extractResponse: (data) => {
      if (!data.content || data.content.length === 0) {
        throw new Error('No response from Anthropic API');
      }
      return data.content[0].text.trim();
    }
  }
};

// ============================================================================
// AI RESPONSE GENERATION
// ============================================================================

/**
 * Generate an AI response using the configured provider.
 *
 * @param {string} userMessage - The user's question
 * @param {string} ragContext - Formatted RAG entries from the retrieval system
 * @param {string} apiKey - API key for the configured provider
 * @param {object} options - Configuration overrides
 * @param {string} options.provider - 'openai' or 'anthropic' (default: 'openai')
 * @param {string} options.model - Model name (uses provider default if not set)
 * @param {number} options.temperature - Response creativity 0-1 (default: 0.7)
 * @param {number} options.maxTokens - Max response length (default: 500)
 * @returns {Promise<string>} AI-generated response text
 */
async function generateResponse(userMessage, ragContext, apiKey, options = {}) {
  const providerName = options.provider || 'openai';
  const provider = PROVIDERS[providerName];

  if (!provider) {
    throw new Error(`Unknown AI provider: "${providerName}". Supported: openai, anthropic`);
  }

  const model = options.model || provider.defaultModel;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 500;

  // Build the messages array (same structure for both providers — the provider
  // config handles any format differences in buildPayload)
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'system',
      content: `Here is the relevant information from the knowledge base:\n\n${ragContext}\n\nUse ONLY this information to answer the user's question. If the answer isn't in these entries, say so honestly.`
    },
    {
      role: 'user',
      content: userMessage
    }
  ];

  const payload = provider.buildPayload(messages, model, temperature, maxTokens);

  // Build headers — differs between providers
  const headers = { 'Content-Type': 'application/json' };

  if (providerName === 'anthropic') {
    headers['x-api-key'] = provider.authHeader(apiKey);
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = provider.authHeader(apiKey);
  }

  const response = await fetch(provider.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`${providerName} API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return provider.extractResponse(data);
}

/**
 * Fallback response when the AI service is unavailable.
 * CUSTOMIZE: Update the contact info.
 */
function getFallbackResponse() {
  return "I'm having trouble connecting right now. Please try again in a moment, or reach out directly through the contact page.";
}

module.exports = {
  generateResponse,
  getFallbackResponse,
  SYSTEM_PROMPT,
  PROVIDERS
};
