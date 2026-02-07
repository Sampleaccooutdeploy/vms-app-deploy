// Simple in-memory rate limiter for server actions
// For production, consider using Redis or a distributed rate limiter

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

export function rateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new window
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
    }

    if (entry.count >= maxAttempts) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: entry.resetTime - now
        };
    }

    entry.count++;
    return {
        allowed: true,
        remaining: maxAttempts - entry.count,
        resetIn: entry.resetTime - now
    };
}

// Generate rate limit key from IP or identifier
export function getRateLimitKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
}
