/**
 * Rate Limiting System
 * Prevents abuse using Cloudflare Workers KV.
 *
 * Default limits:
 *   - 10 messages per visitor per hour (session-based)
 *   - 100 messages per IP per day
 *
 * CUSTOMIZE: Adjust VISITOR_LIMIT and IP_LIMIT for your expected traffic.
 */

const VISITOR_LIMIT = 10;
const IP_LIMIT = 100;
const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS = 86400;

/**
 * Check if a visitor has exceeded rate limits.
 *
 * @param {string} sessionId - Visitor session identifier
 * @param {string} ipAddress - Visitor IP address
 * @param {KVNamespace} kv - Cloudflare KV binding
 * @returns {Promise<{allowed: boolean, reason?: string, retryAfter?: number}>}
 */
async function checkRateLimit(sessionId, ipAddress, kv) {
  const now = Math.floor(Date.now() / 1000);

  // Session-based limit
  const sessionKey = `session:${sessionId}`;
  const sessionData = await kv.get(sessionKey, { type: 'json' });

  if (sessionData) {
    if (now < sessionData.resetAt && sessionData.count >= VISITOR_LIMIT) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. You can send ${VISITOR_LIMIT} messages per hour.`,
        retryAfter: sessionData.resetAt - now
      };
    }

    if (now < sessionData.resetAt) {
      await kv.put(sessionKey, JSON.stringify({ count: sessionData.count + 1, resetAt: sessionData.resetAt }), { expirationTtl: HOUR_IN_SECONDS });
    } else {
      await kv.put(sessionKey, JSON.stringify({ count: 1, resetAt: now + HOUR_IN_SECONDS }), { expirationTtl: HOUR_IN_SECONDS });
    }
  } else {
    await kv.put(sessionKey, JSON.stringify({ count: 1, resetAt: now + HOUR_IN_SECONDS }), { expirationTtl: HOUR_IN_SECONDS });
  }

  // IP-based limit
  const ipKey = `ip:${ipAddress}`;
  const ipData = await kv.get(ipKey, { type: 'json' });

  if (ipData) {
    if (now < ipData.resetAt && ipData.count >= IP_LIMIT) {
      return {
        allowed: false,
        reason: `IP rate limit exceeded. Maximum ${IP_LIMIT} messages per day.`,
        retryAfter: ipData.resetAt - now
      };
    }

    if (now < ipData.resetAt) {
      await kv.put(ipKey, JSON.stringify({ count: ipData.count + 1, resetAt: ipData.resetAt }), { expirationTtl: DAY_IN_SECONDS });
    } else {
      await kv.put(ipKey, JSON.stringify({ count: 1, resetAt: now + DAY_IN_SECONDS }), { expirationTtl: DAY_IN_SECONDS });
    }
  } else {
    await kv.put(ipKey, JSON.stringify({ count: 1, resetAt: now + DAY_IN_SECONDS }), { expirationTtl: DAY_IN_SECONDS });
  }

  return { allowed: true };
}

/**
 * Extract session ID from request headers (or generate a fallback).
 */
function getSessionId(request) {
  const sessionHeader = request.headers.get('X-Session-ID');
  if (sessionHeader) return sessionHeader;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  return `${ip}-${hashString(ua)}`;
}

/**
 * Get the client IP address from Cloudflare headers.
 */
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0] ||
         'unknown';
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

module.exports = {
  checkRateLimit,
  getSessionId,
  getClientIP,
  VISITOR_LIMIT,
  IP_LIMIT
};
