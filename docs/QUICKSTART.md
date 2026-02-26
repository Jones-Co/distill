# Quickstart Guide

This guide walks you through the full pipeline: creating your knowledge base, deploying the backend, and embedding the widget on your site.

**Time estimate:** 2-4 hours for the first deployment.

**Prerequisites:** Node.js 18+, a Cloudflare account (free tier works), an OpenAI or Anthropic API key.

## Step 1: Create Your Knowledge Base

### 1a. Gather Your Documents

Collect the source material you want your chatbot to know about: resume, portfolio content, project descriptions, blog posts, service pages, etc. More is better — the parser can handle a lot.

### 1b. Parse Documents into JSONL

Open your LLM of choice (ChatGPT, Claude, etc.) and paste the document parser prompt from `templates/interview-bot/DOCUMENT-PARSER-PROMPT.md`. Then paste your documents.

The LLM will output JSONL entries. Save this output to a file called `knowledge.jsonl`.

### 1c. Validate Your Knowledge Base

```bash
node scripts/validate.js knowledge.jsonl
```

Fix any errors. Warnings are advisory — address them if you want cleaner data.

**Expected result:** 20-80 entries depending on how much source material you provided.

### 1d. Run the Interview Bot (recommended)

This is optional but strongly recommended. The document parser captures facts; the interview captures stories, reasoning, and tacit knowledge.

Open your LLM and paste the interview system prompt from `templates/interview-bot/INTERVIEW-FRAMEWORK.md`. Include your existing JSONL entries in the context so the bot knows what it already has.

After each interview session, generate new JSONL entries and append them to your `knowledge.jsonl` file.

**Expected result:** Your knowledge base grows from 40-80 entries to 120-200+.

## Step 2: Set Up the Backend

### 2a. Copy the Template

```bash
cp -r templates/backend/ my-chatbot-backend/
cd my-chatbot-backend/
```

### 2b. Add Your Knowledge Base

```bash
cp ../knowledge.jsonl ./knowledge.jsonl
```

### 2c. Install Dependencies

```bash
npm install
```

### 2d. Build the Knowledge Module

```bash
npm run build
```

This converts your `knowledge.jsonl` into a JavaScript module the Worker can import.

### 2e. Customize

Edit these files:

**`src/ai-integration.js`** — Update the SYSTEM_PROMPT:
- Replace `[YOUR NAME]` with your name
- Adjust the tone and conversation style
- Update the fallback response with your contact info

**`src/index.js`** — Update:
- `ALLOWED_ORIGINS` — Your website domain(s)
- `NO_MATCH_RESPONSE` — What to say when no knowledge matches
- `DEFAULT_SUGGESTIONS` — Follow-up questions to suggest

**`wrangler.toml`** — Update:
- `name` — A unique name for your Worker

### 2f. Choose Your AI Provider

The backend supports both OpenAI and Anthropic (Claude). We recommend:
- **OpenAI** (default) for the chatbot backend — cost-effective at ~$0.002/conversation with GPT-3.5-turbo
- **Claude** for building the knowledge base — more reliable structured JSONL output

You can switch providers at any time by changing a secret value.

### 2g. Create Cloudflare Resources

```bash
# Login to Cloudflare
npx wrangler login

# Create a KV namespace for rate limiting
npx wrangler kv namespace create RATE_LIMIT
```

Copy the `id` from the output and paste it into `wrangler.toml`.

### 2h. Set Your API Key(s)

```bash
# For OpenAI (default):
npx wrangler secret put OPENAI_API_KEY
# Paste your key when prompted

# For Anthropic (optional — if you want to use Claude for responses):
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put AI_PROVIDER
# Enter 'anthropic' when prompted
```

### 2i. Run the Test Suite

```bash
npm test
```

This runs 77 tests across the retrieval engine and AI integration layer. All should pass before deploying.

### 2j. Test Locally

```bash
npm run dev
```

Test with curl:

```bash
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about yourself"}'
```

### 2k. Deploy

```bash
npm run deploy
```

Note your Worker URL — it will look like: `https://my-chatbot-backend.your-account.workers.dev`

## Step 3: Add the Widget to Your Site

### 3a. Copy the Widget

Copy `templates/frontend/chatbot-widget.js` to wherever you host static files (CDN, GitHub Pages, your server, etc.).

### 3b. Add to Your Website

Add this to your site's HTML, just before `</body>`:

```html
<script>
  window.RAG_CHATBOT_CONFIG = {
    apiEndpoint: 'https://my-chatbot-backend.your-account.workers.dev/chat',
    name: 'Your Name',
    greeting: 'Hi! I\'m an AI assistant. Ask me anything about [Your Name]\'s work and experience.',
    placeholder: 'Ask me anything...',
    suggestedQuestions: [
      "What's your background?",
      "What projects have you worked on?",
      "How can I get in touch?"
    ],
    primaryColor: '#2563eb',
    bubbleLabel: 'Ask Me'
  };
</script>
<script src="https://your-cdn.com/chatbot-widget.js"></script>
```

### 3c. Verify

Open your site. You should see a chat bubble in the bottom-right corner. Click it, ask a question, and verify you get a response from your knowledge base.

## Step 4: Iterate

Your chatbot is live. Here's how to improve it:

**Add more knowledge:** Run additional interview sessions to fill gaps. Append new entries to `knowledge.jsonl`, rebuild with `npm run build`, and redeploy with `npm run deploy`.

**Check what's missing:** Look at your Worker logs (`npx wrangler tail`) to see what questions people ask that don't get good matches. These are gaps in your knowledge base.

**Adjust the tone:** If responses feel too formal or too casual, tweak the SYSTEM_PROMPT in `ai-integration.js`.

**Upgrade the model:** Change `AI_MODEL` in your Worker secrets to use a more capable model (e.g., `gpt-4o` or `claude-sonnet-4-5-20250929`). Better responses, higher cost per conversation.

## Hosting Options for the Widget

The widget is a single JavaScript file — host it anywhere that serves static files:

- **jsDelivr** (free, CDN) — Upload to a GitHub repo, reference via jsDelivr
- **GitHub Pages** (free) — Host directly from your repo
- **Cloudflare Pages** (free) — Deploy alongside your Worker
- **Your own server** — Just serve the `.js` file
- **Ghost/WordPress code injection** — Paste the script tags directly

## Cost Summary

At typical personal portfolio traffic:

| Component | Free Tier | Paid Tier |
|-----------|-----------|-----------|
| Cloudflare Workers | 100k requests/day | $5/month (10M requests) |
| Cloudflare KV | 100k reads/day | Included in Workers paid |
| AI Provider (OpenAI or Anthropic) | — | ~$0.002-0.005/conversation |
| **Monthly estimate** | **Free** (low traffic) | **$5-10** (moderate traffic) |

## Troubleshooting

**Widget doesn't appear:** Check browser console for errors. Most common: wrong `apiEndpoint` URL, or CORS not configured (check `ALLOWED_ORIGINS` in `index.js`).

**"CORS error" in console:** Add your site's domain to `ALLOWED_ORIGINS` in `src/index.js` and redeploy.

**Responses are generic/wrong:** Check that `knowledge.jsonl` has relevant entries. Run the validator. If entries exist but aren't being retrieved, the keywords might not match — add qa_pair entries with natural-language questions.

**Rate limit hit immediately:** Clear `localStorage` in your browser (the session ID resets). For testing, temporarily increase `VISITOR_LIMIT` in `rate-limiter.js`.

**Deploy fails:** Make sure `wrangler.toml` has your KV namespace ID and you've run `npx wrangler login`.
