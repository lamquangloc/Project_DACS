import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';

export class CategoryController {
  static async create(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      
      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Tên và mô tả danh mục là bắt buộc' 
        });
      }

      // Kiểm tra file upload
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'Hình ảnh là bắt buộc'
        });
      }

      // Kiểm tra nếu có lỗi validate file
      if (req.fileValidationError) {
        return res.status(400).json({
          status: 'error',
          message: req.fileValidationError
        });
      }

      // Lấy đường dẫn ảnh từ multer
      const imagePath = `/uploads/categories/${req.file.filename}`;

      const category = await CategoryService.createCategory({
        name,
        description,
        image: imagePath
      });

      res.status(201).json({
        status: 'success',
        data: category
      });
    } catch (error: any) {
      console.error('Error creating category:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi tạo danh mục' 
      });
    }
    return;
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'ID danh mục là bắt buộc'
        });
      }

      // Kiểm tra nếu có lỗi validate file
      if (req.fileValidationError) {
        return res.status(400).json({
          status: 'error',
          message: req.fileValidationError
        });
      }

      const updateData: any = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.file) {
        updateData.image = `/uploads/categories/${req.file.filename}`;
      }

      const category = await CategoryService.updateCategory(id, updateData);
      res.json({
        status: 'success',
        data: category
      });
    } catch (error: any) {
      console.error('Error updating category:', error);
      if (error.message === 'Category not found or has been deleted') {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy danh mục hoặc đã bị xóa'
        });
      }
      return res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi cập nhật danh mục' 
      });
    }
    return;
  }

  static async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await CategoryService.getAllCategories(page, limit);
      res.json({
        status: 'success',
        data: result
      });
    } catch (error: any) {
      console.error('Error getting categories:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi lấy danh sách danh mục' 
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'ID danh mục là bắt buộc'
        });
      }

      const category = await CategoryService.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Không tìm thấy danh mục' 
        });
      }
      
      res.json({
        status: 'success',
        data: category
      });
    } catch (error: any) {
      console.error('Error getting category:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi lấy thông tin danh mục' 
      });
    }
    return;
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'ID danh mục là bắt buộc'
        });
      }

      await CategoryService.deleteCategory(id);
      res.json({ 
        status: 'success',
        message: 'Đã xóa danh mục thành công' 
      });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      if (error.message === 'Category not found or has been deleted') {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy danh mục hoặc đã bị xóa'
        });
      }
      return res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi xóa danh mục' 
      });
    }
    return;
  }

  static async deleteMany(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Danh sách ID danh mục không hợp lệ'
        });
      }

      await CategoryService.deleteMany(ids);
      res.json({ 
        status: 'success',
        message: 'Đã xóa các danh mục thành công' 
      });
    } catch (error: any) {
      console.error('Error deleting categories:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error.message || 'Đã xảy ra lỗi khi xóa các danh mục' 
      });
    }
    return;
  }
}