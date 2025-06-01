import { Request, Response, NextFunction } from 'express';
import { ComboService } from '../services/combo.service';
import { AppError } from '../middleware/error.middleware';

export class ComboController {
  static async createCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, price, items } = req.body;
      console.log("Create combo request file:", req.file);
      console.log("Create combo request body:", req.body);
      const image = req.file ? `/uploads/combos/${req.file.filename}` : undefined;
      console.log("Image path:", image);

      if (!name || !price) {
        throw new AppError('Name and price are required', 400);
      }

      // Parse items từ string thành array (nếu cần)
      let parsedItems;
      try {
        parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        console.log("Parsed items:", parsedItems);
      } catch (error) {
        console.error("Error parsing items:", error);
        throw new AppError('Invalid items format. Must be a valid JSON array', 400);
      }

      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        console.error("Invalid items array:", parsedItems);
        throw new AppError('Items must be a non-empty array', 400);
      }

      // Validate items
      for (const item of parsedItems) {
        console.log("Validating item:", item);
        if (!item.productId || !item.quantity) {
          console.error("Invalid item:", item);
          throw new AppError('Each item must have productId and quantity', 400);
        }

        if (typeof item.quantity !== 'number' && isNaN(parseInt(item.quantity))) {
          console.error("Invalid quantity:", item.quantity);
          throw new AppError('Quantity must be a number', 400);
        }
      }

      // Convert price to number if it's a string
      const priceNum = typeof price === 'string' ? parseFloat(price) : price;
      
      if (isNaN(priceNum) || priceNum <= 0) {
        console.error("Invalid price:", price);
        throw new AppError('Price must be a positive number', 400);
      }

      console.log("Creating combo with data:", {
        name,
        description,
        price: priceNum,
        image,
        items: parsedItems
      });

      const combo = await ComboService.createCombo({
        name,
        description,
        price: priceNum,
        image,
        items: parsedItems.map((item: any) => ({
          productId: item.productId,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity
        }))
      });

      console.log("Combo created successfully:", combo);
      res.status(201).json({
        status: 'success',
        message: 'Combo created successfully',
        data: combo
      });
    } catch (error) {
      console.error("Error in createCombo:", error);
      next(error);
    }
  }

  static async getAllCombos(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeDeleted = req.query.includeDeleted === 'true';

      const result = await ComboService.getAllCombos(page, limit, includeDeleted);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getComboById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const combo = await ComboService.getComboById(id);

      if (!combo) {
        return next(new AppError('Combo not found', 404));
      }

      res.json({
        status: 'success',
        data: combo
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, price, items } = req.body;
      console.log("Update combo request file:", req.file);
      console.log("Update combo request body:", req.body);
      const image = req.file ? `/uploads/combos/${req.file.filename}` : undefined;
      console.log("Image path for update:", image);

      const updateData: any = {};

      if (name) updateData.name = name;
      if (description) updateData.description = description;
      
      if (price) {
        const priceNum = typeof price === 'string' ? parseFloat(price) : price;
        if (isNaN(priceNum) || priceNum <= 0) {
          throw new AppError('Price must be a positive number', 400);
        }
        updateData.price = priceNum;
      }
      
      if (image) updateData.image = image;

      if (items) {
        // Parse items từ string thành array (nếu cần)
        let parsedItems;
        try {
          parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        } catch (error) {
          throw new AppError('Invalid items format. Must be a valid JSON array', 400);
        }

        if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
          throw new AppError('Items must be a non-empty array', 400);
        }

        // Validate items
        for (const item of parsedItems) {
          if (!item.productId || !item.quantity) {
            throw new AppError('Each item must have productId and quantity', 400);
          }

          if (typeof item.quantity !== 'number' && isNaN(parseInt(item.quantity))) {
            throw new AppError('Quantity must be a number', 400);
          }
        }

        updateData.items = parsedItems.map((item: any) => ({
          productId: item.productId,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity
        }));
      }

      const combo = await ComboService.updateCombo(id, updateData);
      res.json({
        status: 'success',
        data: combo
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const combo = await ComboService.deleteCombo(id);

      if (!combo) {
        return next(new AppError('Combo not found', 404));
      }

      res.json({
        message: 'Combo deleted successfully',
        combo
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteManyCombos(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No ids provided' });
      }
      await ComboService.deleteManyCombos(ids);
      res.json({ status: 'success', message: 'Deleted combos successfully' });
    } catch (error) {
      next(error);
    }
    return;
  }
} 