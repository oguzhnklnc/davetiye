export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function evaluateRateLimit({ count, oldest, now, limit, windowSeconds }) {
  if (count < limit) return { allowed: true, retryAfter: 0, count };
  const oldestTime = oldest ? new Date(oldest).getTime() : now;
  const retryAfter = Math.max(1, Math.ceil((oldestTime + windowSeconds * 1000 - now) / 1000));
  return { allowed: false, retryAfter, count };
}
