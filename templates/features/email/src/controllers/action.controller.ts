import type { Request, Response } from 'express';
import { requestAction, consumeAction, type ActionPurpose } from '../services/auth/action.service.js';
import { AppError } from '../errors/app-error.js';
import { sendResponse } from '../utils/send-response.js';

/** Preserve account privacy while requesting the selected email action. */
export function requestActionController(purpose: ActionPurpose) { return async (req: Request, res: Response): Promise<void> => { try { await requestAction((req.validated!.body as { email: string }).email, purpose); } catch (error) { if (!(error instanceof AppError) || !['EMAIL_UNAVAILABLE', 'EMAIL_PROVIDER_ERROR'].includes(error.errorCode)) throw error; if (process.env.NODE_ENV !== 'test') console.error('Email action could not be delivered'); } sendResponse(res, { statusCode: 202, message: 'Request accepted. If an eligible account exists, check your email' }); }; }
/** Complete only the declared action purpose; credentials cannot cross action families. */
export function consumeActionController(purpose: ActionPurpose) { return async (req: Request, res: Response): Promise<void> => { const input = req.validated!.body as { token: string; password?: string }; await consumeAction(input.token, purpose, input.password); sendResponse(res, { message: purpose === 'verify' ? 'Email verified' : 'Password reset. Please sign in again' }); }; }
