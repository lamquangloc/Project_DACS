import { Request, Response } from 'express';
import cartService, { CartData } from '../services/cart.service';
import { AppError } from '../utils/appError';

/**
 * Lưu cart
 * POST /api/cart/save
 */
export const saveCart = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📥 Save cart request:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      userObject: req.user ? { id: req.user.id, email: req.user.email, name: req.user.name } : undefined,
      bodyUserId: req.body.userId,
      itemsCount: req.body.items?.length,
      total: req.body.total,
      items: req.body.items?.slice(0, 2) // Log first 2 items để debug
    });
    
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      console.error('❌ No userId found in request');
      console.error('   req.user:', req.user);
      console.error('   req.body.userId:', req.body.userId);
      throw new AppError('User ID is required', 400);
    }

    const { items, total } = req.body;

    if (!items || !Array.isArray(items)) {
      throw new AppError('Items must be an array', 400);
    }

    if (typeof total !== 'number') {
      throw new AppError('Total must be a number', 400);
    }

    const cartData: CartData = {
      items,
      total,
    };

    console.log('💾 Saving cart to database for userId:', userId);
    const result = await cartService.saveCart(userId, cartData);
    console.log('✅ Cart saved successfully:', result);

    res.status(200).json({
      success: true,
      message: 'Cart saved successfully',
      data: result.cart,
    });
  } catch (error) {
    console.error('❌ Save cart error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save cart',
      });
    }
  }
};

/**
 * Lấy cart
 * GET /api/cart
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📥 Get cart request:', {
      userId: req.user?.id,
      queryUserId: req.query.userId
    });
    
    const userId = req.user?.id || req.query.userId as string;
    
    if (!userId) {
      console.error('❌ No userId found in request');
      throw new AppError('User ID is required', 400);
    }

    console.log('📦 Getting cart from database for userId:', userId);
    const cart = await cartService.getCart(userId);
    console.log('✅ Cart retrieved:', {
      itemsCount: cart.items?.length || 0,
      total: cart.total
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('❌ Get cart error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get cart',
      });
    }
  }
};

/**
 * Xóa cart
 * DELETE /api/cart
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    await cartService.clearCart(userId);

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { items: [], total: 0 },
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to clear cart',
      });
    }
  }
};

/**
 * Thêm item vào cart
 * POST /api/cart/add
 */
export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const { productId, name, price, quantity, image } = req.body;

    if (!productId || !name || !price || !quantity) {
      throw new AppError('Missing required fields: productId, name, price, quantity', 400);
    }

    const cart = await cartService.addItemToCart(userId, {
      productId,
      name,
      price,
      quantity,
      image,
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
    console.error('Add item error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add item to cart',
      });
    }
  }
};

/**
 * Xóa item khỏi cart
 * DELETE /api/cart/item/:productId
 */
export const removeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { productId } = req.params;
    
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    const cart = await cartService.removeItemFromCart(userId, productId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart,
    });
  } catch (error) {
    console.error('Remove item error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove item from cart',
      });
    }
  }
};

/**
 * Cập nhật quantity của item
 * PUT /api/cart/item/:productId
 */
export const updateItemQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    if (typeof quantity !== 'number') {
      throw new AppError('Quantity must be a number', 400);
    }

    const cart = await cartService.updateItemQuantity(userId, productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Item quantity updated',
      data: cart,
    });
  } catch (error) {
    console.error('Update item quantity error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update item quantity',
      });
    }
  }
};

