import { Request, Response } from 'express';
import { sendResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as usersService from './users.service';

export const getAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await usersService.listAdmins();
  return sendResponse(res, 200, 'Admin users retrieved', admins);
});
