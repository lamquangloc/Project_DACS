import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { AppError } from '../middleware/error.middleware';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export class ProductController {
  static async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', categoryId } = req.query;
      const result = await ProductService.getAllProducts(
        Number(page),
        Number(limit),
        String(search),
        String(sortBy),
        sortOrder as 'asc' | 'desc',
        categoryId && categoryId !== 'null' && categoryId !== 'undefined' ? String(categoryId) : undefined
      );
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      res.json({
        status: 'success',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, price, costPrice, categoryIds, unitId } = req.body;
      const image = req.file ? `/uploads/products/${req.file.filename}` : undefined;

      // Validate required fields
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!description) missingFields.push('description');
      if (!price) missingFields.push('price');
      if (!categoryIds) missingFields.push('categoryIds');
      if (!unitId) missingFields.push('unitId');

      if (missingFields.length > 0) {
        throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Validate price and costPrice are numbers
      const priceNumber = parseFloat(price);
      const costPriceNumber = parseFloat(costPrice || 0); // Default to 0 if not provided
      if (isNaN(priceNumber)) {
        throw new AppError('Price must be a number', 400);
      }
      if (isNaN(costPriceNumber)) {
        throw new AppError('Cost price must be a number', 400);
      }

      // Validate categoryIds is an array
      const categoryIdsArray = Array.isArray(categoryIds) 
        ? categoryIds 
        : typeof categoryIds === 'string' 
          ? JSON.parse(categoryIds) 
          : null;

      if (!Array.isArray(categoryIdsArray) || categoryIdsArray.length === 0) {
        throw new AppError('categoryIds must be a non-empty array', 400);
      }

      const product = await ProductService.createProduct({
        name,
        description,
        price: priceNumber,
        costPrice: costPriceNumber,
        categoryIds: categoryIdsArray,
        unitId,
        image
      });

      res.status(201).json({
        status: 'success',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, price, costPrice, categoryIds, unitId } = req.body;
      const image = req.file ? `/uploads/products/${req.file.filename}` : undefined;

      const updateData: any = {};

      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (price) {
        const priceNumber = parseFloat(price);
        if (isNaN(priceNumber)) {
          throw new AppError('Price must be a number', 400);
        }
        updateData.price = priceNumber;
      }
      if (costPrice !== undefined) {
        const costPriceNumber = parseFloat(costPrice);
        if (isNaN(costPriceNumber)) {
          throw new AppError('Cost price must be a number', 400);
        }
        updateData.costPrice = costPriceNumber;
      }
      if (image) updateData.image = image;
      if (unitId) updateData.unitId = unitId;

      // Handle categoryIds if provided
      if (categoryIds) {
        const categoryIdsArray = Array.isArray(categoryIds) 
          ? categoryIds 
          : typeof categoryIds === 'string' 
            ? JSON.parse(categoryIds) 
            : null;

        if (!Array.isArray(categoryIdsArray) || categoryIdsArray.length === 0) {
          throw new AppError('categoryIds must be a non-empty array', 400);
        }

        updateData.categoryIds = categoryIdsArray;
      }

      const product = await ProductService.updateProduct(id, updateData);

      res.json({
        status: 'success',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ProductService.deleteProduct(id);
      res.json({ 
        status: 'success', 
        message: 'Product deleted successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMany(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('ids must be a non-empty array', 400);
      }
      await ProductService.deleteMany(ids);
      res.json({
        status: 'success',
        message: 'Products deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRandomProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 8;
      const all = await prisma.product.findMany({
        where: { isDeleted: false },
        include: {
          categories: {
            include: { category: true }
          },
          unit: true
        }
      });
      // Lọc bỏ sản phẩm thiếu trường bắt buộc
      const valid = all.filter(p => p && p.name && p.price);
      const shuffled = valid.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, limit);
      res.json({ status: 'success', data: { products: selected } });
    } catch (error) {
      console.error('Error in getRandomProducts:', error);
      next(error);
    }
  }
} 