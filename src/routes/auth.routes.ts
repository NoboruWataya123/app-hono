import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { UserRepository } from '../lib/db/repositories';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import {
  RegisterSchema,
  LoginSchema,
  AuthResponseSchema,
  UserSchema,
  ErrorSchema,
} from '../schemas/user.schemas';

const authApp = new OpenAPIHono();

// Register route
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Registration failed',
    },
  },
});

authApp.openapi(registerRoute, async (c) => {
  const { email, username, password } = c.req.valid('json');

  // Check if user already exists
  const existingEmail = await UserRepository.findByEmail(email);
  if (existingEmail) {
    return c.json(
      {
        success: false,
        error: 'Email already registered',
      },
      400
    );
  }

  const existingUsername = await UserRepository.findByUsername(username);
  if (existingUsername) {
    return c.json(
      {
        success: false,
        error: 'Username already taken',
      },
      400
    );
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await UserRepository.create({
    id: `usr_${nanoid(10)}`,
    email,
    username,
    passwordHash,
    role: 'user',
  });

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  return c.json(
    {
      token,
      user: {
        ...userWithoutPassword,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    },
    201
  );
});

// Login route
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Login successful',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid credentials',
    },
  },
});

authApp.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');

  // Find user by email
  const user = await UserRepository.findByEmail(email);
  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Invalid email or password',
      },
      401
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json(
      {
        success: false,
        error: 'Invalid email or password',
      },
      401
    );
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  return c.json({
    token,
    user: {
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
});

// Get current user route
const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Authentication'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
      description: 'Current user data',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
});

authApp.openapi(getMeRoute, async (c) => {
  const userPayload = c.get('user');

  const user = await UserRepository.findById(userPayload.userId);
  if (!user) {
    return c.json(
      {
        success: false,
        error: 'User not found',
      },
      404
    );
  }

  const { passwordHash: _, ...userWithoutPassword } = user;

  return c.json({
    ...userWithoutPassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

export default authApp;
