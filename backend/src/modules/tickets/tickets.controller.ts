import { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { sendResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ticketsService from './tickets.service';
import { ListTicketsQuery } from './tickets.validation';

function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return req.user;
}

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.createTicket(req.body, user);
  return sendResponse(res, 201, 'Ticket created successfully', ticket);
});

export const getMyTickets = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ListTicketsQuery;
  const result = await ticketsService.listMyTickets(user.id, query);
  return sendResponse(res, 200, 'User tickets retrieved', result.tickets, result.meta);
});

export const getAllTickets = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTicketsQuery;
  const result = await ticketsService.listAllTickets(query);
  return sendResponse(res, 200, 'All tickets retrieved', result.tickets, result.meta);
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.getTicketById(String(req.params.id), user);
  return sendResponse(res, 200, 'Ticket retrieved successfully', ticket);
});

export const updateOwnTicket = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.updateOwnTicket(String(req.params.id), req.body, user);
  return sendResponse(res, 200, 'Ticket updated successfully', ticket);
});

export const deleteOwnTicket = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await ticketsService.deleteOwnTicket(String(req.params.id), user);
  return sendResponse(res, 200, 'Ticket deleted successfully', result);
});

export const adminDeleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const result = await ticketsService.adminDeleteTicket(String(req.params.id));
  return sendResponse(res, 200, 'Ticket deleted successfully', result);
});

export const updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.updateTicketStatus(String(req.params.id), req.body, user);
  return sendResponse(res, 200, 'Ticket status updated successfully', ticket);
});

export const updateTicketPriority = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.updateTicketPriority(String(req.params.id), req.body, user);
  return sendResponse(res, 200, 'Ticket priority updated successfully', ticket);
});

export const assignTicket = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const ticket = await ticketsService.assignTicket(String(req.params.id), req.body, user);
  return sendResponse(res, 200, 'Ticket assigned successfully', ticket);
});
