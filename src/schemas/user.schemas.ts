import { z } from '@hono/zod-openapi';

// User schemas
export const UserSchema = z.object({
  id: z.string().openapi({ example: 'usr_123abc' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  username: z.string().min(3).max(50).openapi({ example: 'johndoe' }),
  role: z.enum(['admin', 'user']).openapi({ example: 'user' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
}).openapi('User');

export const RegisterSchema = z.object({
  email: z.string().email().openapi({
    example: 'user@example.com',
    description: 'User email address',
  }),
  username: z.string().min(3).max(50).openapi({
    example: 'johndoe',
    description: 'Username (3-50 characters)',
  }),
  password: z.string().min(8).openapi({
    example: 'SecurePass123!',
    description: 'Password (minimum 8 characters)',
  }),
});

export const LoginSchema = z.object({
  email: z.string().email().openapi({
    example: 'user@example.com',
  }),
  password: z.string().openapi({
    example: 'SecurePass123!',
  }),
});

export const AuthResponseSchema = z.object({
  token: z.string().openapi({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT authentication token',
  }),
  user: UserSchema,
}).openapi('AuthResponse');

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
}).openapi('UpdateUser');

// Error schemas
export const ErrorSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Error message' }),
  code: z.string().optional().openapi({ example: 'VALIDATION_ERROR' }),
}).openapi('Error');

export const ValidationErrorSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: 'Validation failed' }),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
}).openapi('ValidationError');
