import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponsePayload<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: PaginationMeta,
): Response<ApiResponsePayload<T>> {
  const payload: ApiResponsePayload<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(payload);
}
