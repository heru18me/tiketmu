import { Request, Response, NextFunction } from 'express';
import * as transactionService from '../services/transaction.service';
import {
  createTransactionSchema,
  updateTransactionStatusSchema,
  transactionFilterSchema,
} from '../validators/transaction.validator';
import { sendSuccess, sendPaginated } from '../utils/response';

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    const transaction = await transactionService.createTransaction(req.user!.userId, data);
    sendSuccess(
      res,
      transaction,
      'Transaction created. Please upload payment proof within 2 hours.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getUserTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = transactionFilterSchema.parse(req.query);
    const { transactions, meta } = await transactionService.getUserTransactions(
      req.user!.userId,
      filters
    );
    sendPaginated(res, transactions, 'Transactions retrieved', meta);
  } catch (error) {
    next(error);
  }
};

export const getOrganizerTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = transactionFilterSchema.parse(req.query);
    const { transactions, meta } = await transactionService.getOrganizerTransactions(
      req.user!.userId,
      filters
    );
    sendPaginated(res, transactions, 'Transactions retrieved', meta);
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.getTransactionById(
      req.params.id,
      req.user!.userId
    );
    sendSuccess(res, transaction, 'Transaction retrieved');
  } catch (error) {
    next(error);
  }
};

export const uploadPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.uploadPaymentProof(
      req.params.id,
      req.user!.userId,
      req.file
    );
    sendSuccess(res, transaction, 'Payment proof uploaded. Waiting for organizer confirmation.');
  } catch (error) {
    transactionService.removeProofFile(req.file);
    next(error);
  }
};

export const updateTransactionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, reason } = updateTransactionStatusSchema.parse(req.body);
    const transaction = await transactionService.updateTransactionStatus(
      req.params.id,
      req.user!.userId,
      action,
      reason
    );
    sendSuccess(
      res,
      transaction,
      action === 'ACCEPT' ? 'Transaction accepted' : 'Transaction rejected'
    );
  } catch (error) {
    next(error);
  }
};
