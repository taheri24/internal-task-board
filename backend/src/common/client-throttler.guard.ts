import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit key per client. Behind the Next.js proxy every request arrives from one
 * address, so the first X-Forwarded-For value is used when present. Login attempts are
 * also keyed by email, so one account cannot exhaust the limit for everyone else.
 *
 * Security note: X-Forwarded-For is client-controlled. Do not expose the API port publicly
 * in production. Only Next.js should reach it.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0]?.trim();
    const ip = forwarded || req.ip || 'unknown';
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return email ? `${ip}|${email}` : ip;
  }

  // Keep the signature from the base class.
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}
