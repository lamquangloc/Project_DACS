import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartData {
  items: CartItem[];
  total: number;
}

class CartService {
  /**
   * Lưu hoặc cập nhật cart cho user
   */
  async saveCart(userId: string, cartData: CartData): Promise<any> {
    try {
      console.log('💾 CartService.saveCart:', {
        userId,
        itemsCount: cartData.items.length,
        total: cartData.total,
        items: cartData.items.slice(0, 2) // Log first 2 items để debug
      });
      
      // Validate userId format (MongoDB ObjectId)
      if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        console.error('❌ Invalid userId format:', userId);
        throw new Error('Invalid userId format');
      }
      
      const cart = await prisma.cart.upsert({
        where: { userId },
        update: {
          items: cartData.items as any,
          total: cartData.total,
          updatedAt: new Date(),
        },
        create: {
          userId,
          items: cartData.items as any,
          total: cartData.total,
        },
      }).catch((error) => {
        console.error('❌ Prisma upsert error:', error);
        throw error;
      });

      console.log('✅ Cart saved to database:', {
        cartId: cart.id,
        itemsCount: (cart.items as CartItem[]).length,
        total: cart.total,
        userId: cart.userId
      });

      return {
        success: true,
        cart: {
          items: cart.items as CartItem[],
          total: cart.total,
        },
      };
    } catch (error) {
      console.error('❌ Error saving cart:', error);
      throw new Error('Failed to save cart');
    }
  }

  /**
   * Lấy cart của user
   */
  async getCart(userId: string): Promise<CartData> {
    try {
      console.log('📦 CartService.getCart for userId:', userId);
      
      const cart = await prisma.cart.findUnique({
        where: { userId },
      });

      if (!cart) {
        console.log('⚠️ No cart found for userId:', userId);
        return { items: [], total: 0 };
      }

      const cartData = {
        items: cart.items as CartItem[],
        total: cart.total,
      };
      
      console.log('✅ Cart retrieved from database:', {
        itemsCount: cartData.items.length,
        total: cartData.total
      });

      return cartData;
    } catch (error) {
      console.error('❌ Error getting cart:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Xóa cart của user
   */
  async clearCart(userId: string): Promise<boolean> {
    try {
      await prisma.cart.delete({
        where: { userId },
      }).catch(() => {
        // Cart không tồn tại, coi như đã xóa thành công
      });
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /**
   * Thêm item vào cart
   */
  async addItemToCart(userId: string, item: CartItem): Promise<CartData> {
    try {
      const currentCart = await this.getCart(userId);
      
      // Tìm item đã có trong cart
      const existingItemIndex = currentCart.items.findIndex(
        (i) => i.productId === item.productId
      );

      let updatedItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Tăng quantity nếu đã có
        updatedItems = [...currentCart.items];
        updatedItems[existingItemIndex].quantity += item.quantity;
      } else {
        // Thêm item mới
        updatedItems = [...currentCart.items, item];
      }

      // Tính lại total
      const total = updatedItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      const cartData: CartData = {
        items: updatedItems,
        total,
      };

      await this.saveCart(userId, cartData);
      return cartData;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw new Error('Failed to add item to cart');
    }
  }

  /**
   * Xóa item khỏi cart
   */
  async removeItemFromCart(userId: string, productId: string): Promise<CartData> {
    try {
      const currentCart = await this.getCart(userId);
      
      const updatedItems = currentCart.items.filter(
        (item) => item.productId !== productId
      );

      // Tính lại total
      const total = updatedItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      const cartData: CartData = {
        items: updatedItems,
        total,
      };

      await this.saveCart(userId, cartData);
      return cartData;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw new Error('Failed to remove item from cart');
    }
  }

  /**
   * Cập nhật quantity của item trong cart
   */
  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartData> {
    try {
      const currentCart = await this.getCart(userId);
      
      if (quantity <= 0) {
        return await this.removeItemFromCart(userId, productId);
      }

      const updatedItems = currentCart.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );

      // Tính lại total
      const total = updatedItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      const cartData: CartData = {
        items: updatedItems,
        total,
      };

      await this.saveCart(userId, cartData);
      return cartData;
    } catch (error) {
      console.error('Error updating item quantity:', error);
      throw new Error('Failed to update item quantity');
    }
  }
}

export default new CartService();

