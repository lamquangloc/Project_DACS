import { Request, Response, NextFunction } from 'express';
import { TableService } from '../services/table.service';
import { AppError } from '../middleware/error.middleware';

export class TableController {
  static async createTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { number, capacity } = req.body;

      if (!number || !capacity) {
        throw new AppError('Number and capacity are required', 400);
      }

      // Chuyển đổi sang số
      const tableNumber = parseInt(number);
      const tableCapacity = parseInt(capacity);

      if (isNaN(tableNumber) || isNaN(tableCapacity)) {
        throw new AppError('Number and capacity must be valid numbers', 400);
      }

      if (tableCapacity <= 0) {
        throw new AppError('Capacity must be greater than 0', 400);
      }

      const table = await TableService.createTable({
        number: tableNumber,
        capacity: tableCapacity
      });

      res.status(201).json(table);
    } catch (error) {
      next(error);
    }
  }

  static async getAllTables(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeDeleted = req.query.includeDeleted === 'true';
      const capacity = req.query.capacity ? parseInt(req.query.capacity as string) : undefined;

      const result = await TableService.getAllTables(page, limit, includeDeleted);

      // Lọc theo capacity nếu có
      if (capacity && !isNaN(capacity)) {
        result.tables = result.tables.filter(table => table.capacity >= capacity);
        result.total = result.tables.length;
        result.totalPages = Math.ceil(result.total / limit);
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getTableById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const table = await TableService.getTableById(id);

      if (!table) {
        throw new AppError('Table not found', 404);
      }

      res.json(table);
    } catch (error) {
      next(error);
    }
  }

  static async updateTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { number, capacity, status } = req.body;

      if (!number && !capacity && !status) {
        throw new AppError('At least one field is required for update', 400);
      }

      const updateData: any = {};

      if (number) {
        const tableNumber = parseInt(number);
        if (isNaN(tableNumber)) {
          throw new AppError('Number must be a valid number', 400);
        }
        updateData.number = tableNumber;
      }

      if (capacity) {
        const tableCapacity = parseInt(capacity);
        if (isNaN(tableCapacity) || tableCapacity <= 0) {
          throw new AppError('Capacity must be a valid positive number', 400);
        }
        updateData.capacity = tableCapacity;
      }

      if (status) {
        if (!['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DELETED'].includes(status)) {
          throw new AppError('Invalid status value', 400);
        }
        updateData.status = status;
      }

      const table = await TableService.updateTable(id, updateData);

      if (!table) {
        throw new AppError('Table not found', 404);
      }

      res.json(table);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const table = await TableService.deleteTable(id);

      if (!table) {
        throw new AppError('Table not found', 404);
      }

      res.json({
        message: 'Table deleted successfully',
        table
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableTables(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, time, guests } = req.query;

      if (!date || !time || !guests) {
        throw new AppError('Date, time and number of guests are required', 400);
      }

      const guestsNum = parseInt(guests as string);
      if (isNaN(guestsNum) || guestsNum <= 0) {
        throw new AppError('Number of guests must be a positive number', 400);
      }

      const tables = await TableService.getAvailableTables(
        new Date(date as string),
        time as string,
        guestsNum
      );

      res.json({
        status: 'success',
        data: {
          tables
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 