import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedUser } from '../types/express';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/jwt';

const USER_CACHE_TTL_MS = 30_000;
const userCache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const payload = verifyAccessToken(token);

    const cached = userCache.get(payload.sub);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      userCache.delete(payload.sub);
      throw new ApiError(401, 'Invalid or inactive user account');
    }

    userCache.set(payload.sub, {
      user,
      expiresAt: Date.now() + USER_CACHE_TTL_MS,
    });

    req.user = user;
    next();
  },
);
