import { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { sendResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as activityService from './activity.service';
import { ListNotificationsQuery } from './activity.validation';

function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return req.user;
}

export const getTicketActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const logs = await activityService.getTicketActivity(String(req.params.id), user);
  return sendResponse(res, 200, 'Ticket activity retrieved successfully', logs);
});

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ListNotificationsQuery;
  const result = await activityService.listUserNotifications(user.id, query);
  return sendResponse(
    res,
    200,
    'Notifications retrieved successfully',
    {
      items: result.notifications,
      unreadCount: result.unreadCount,
    },
    result.meta,
  );
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const notification = await activityService.markNotificationRead(String(req.params.id), user.id);
  return sendResponse(res, 200, 'Notification marked as read', notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await activityService.markAllNotificationsRead(user.id);
  return sendResponse(res, 200, 'All notifications marked as read', result);
});
