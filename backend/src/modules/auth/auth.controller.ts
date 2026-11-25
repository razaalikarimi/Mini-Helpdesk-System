import { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { sendResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  return sendResponse(res, 201, 'Registration successful', result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  return sendResponse(res, 200, 'Login successful', result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  const user = await authService.getCurrentUser(req.user.id);
  return sendResponse(res, 200, 'Authenticated user retrieved', user);
});
