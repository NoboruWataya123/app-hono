import { Context, Next } from 'hono';
import { extractToken, verifyToken } from '../utils/auth';
import type { JWTPayload } from '../types';

// Extend Hono context with user
export type AuthContext = {
  Variables: {
    user: JWTPayload;
  };
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      {
        success: false,
        error: 'No authorization token provided',
      },
      401
    );
  }

  try {
    const payload = verifyToken(token);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Invalid or expired token',
      },
      401
    );
  }
}

/**
 * Admin-only middleware
 * Requires user to be authenticated and have admin role
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user') as JWTPayload;

  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Authentication required',
      },
      401
    );
  }

  if (user.role !== 'admin') {
    return c.json(
      {
        success: false,
        error: 'Admin access required',
      },
      403
    );
  }

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user to context if token is valid, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (token) {
    try {
      const payload = verifyToken(token);
      c.set('user', payload);
    } catch {
      // Invalid token, but we don't reject the request
    }
  }

  await next();
}
