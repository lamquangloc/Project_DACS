import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiResponse } from '../types/response';

export const UnitController = {
  // Get all units
  getAll: async (_req: Request, res: Response) => {
    try {
      const units = await prisma.unit.findMany({
        where: {
          isDeleted: false
        },
        orderBy: {
          name: 'asc'
        }
      });

      const response: ApiResponse<any> = {
        status: 'success',
        message: 'Lấy danh sách đơn vị tính thành công',
        data: {
          units,
          totalItems: units.length,
          currentPage: 1,
          totalPages: 1
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting units:', error);
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Có lỗi xảy ra khi lấy danh sách đơn vị tính',
        data: null
      };
      res.status(500).json(response);
    }
  },

  // Get unit by ID
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const unit = await prisma.unit.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!unit) {
        const response: ApiResponse<null> = {
          status: 'error',
          message: 'Không tìm thấy đơn vị tính',
          data: null
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<any> = {
        status: 'success',
        message: 'Lấy thông tin đơn vị tính thành công',
        data: unit
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting unit:', error);
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Có lỗi xảy ra khi lấy thông tin đơn vị tính',
        data: null
      };
      res.status(500).json(response);
    }
    return;
  },

  // Create new unit
  create: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      // Check if unit with same name exists
      const existingUnit = await prisma.unit.findFirst({
        where: {
          name,
          isDeleted: false
        }
      });

      if (existingUnit) {
        const response: ApiResponse<null> = {
          status: 'error',
          message: 'Đơn vị tính đã tồn tại',
          data: null
        };
        return res.status(400).json(response);
      }

      const unit = await prisma.unit.create({
        data: {
          name
        }
      });

      const response: ApiResponse<any> = {
        status: 'success',
        message: 'Tạo đơn vị tính thành công',
        data: unit
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating unit:', error);
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Có lỗi xảy ra khi tạo đơn vị tính',
        data: null
      };
      res.status(500).json(response);
    }
    return;
  },

  // Update unit
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      // Check if unit exists
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!existingUnit) {
        const response: ApiResponse<null> = {
          status: 'error',
          message: 'Không tìm thấy đơn vị tính',
          data: null
        };
        return res.status(404).json(response);
      }

      // Check if new name conflicts with existing unit
      const duplicateUnit = await prisma.unit.findFirst({
        where: {
          name,
          isDeleted: false,
          NOT: {
            id
          }
        }
      });

      if (duplicateUnit) {
        const response: ApiResponse<null> = {
          status: 'error',
          message: 'Đơn vị tính đã tồn tại',
          data: null
        };
        return res.status(400).json(response);
      }

      const unit = await prisma.unit.update({
        where: { id },
        data: { name }
      });

      const response: ApiResponse<any> = {
        status: 'success',
        message: 'Cập nhật đơn vị tính thành công',
        data: unit
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating unit:', error);
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Có lỗi xảy ra khi cập nhật đơn vị tính',
        data: null
      };
      res.status(500).json(response);
    }
    return;
  },

  // Delete unit (soft delete)
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if unit exists
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!existingUnit) {
        const response: ApiResponse<null> = {
          status: 'error',
          message: 'Không tìm thấy đơn vị tính',
          data: null
        };
        return res.status(404).json(response);
      }

      await prisma.unit.update({
        where: { id },
        data: { isDeleted: true }
      });

      const response: ApiResponse<null> = {
        status: 'success',
        message: 'Xóa đơn vị tính thành công',
        data: null
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting unit:', error);
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Có lỗi xảy ra khi xóa đơn vị tính',
        data: null
      };
      res.status(500).json(response);
    }
    return;
  }
}; 