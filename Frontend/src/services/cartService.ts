import axios from '../config/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface CartItem {
  productId?: string;
  comboId?: string;
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
   * Lưu cart lên server
   */
  async saveCart(cartItems: any[]): Promise<CartData> {
    try {
      // Transform cart items từ localStorage format sang API format
      // ✅ Phân biệt product và combo để lưu đúng productId hoặc comboId
      const items: CartItem[] = cartItems.map((item: any) => {
        if (item.combo) {
          // ✅ Đây là combo
          const comboId = item.combo._id || item.combo.id;
          return {
            comboId: comboId || undefined,
            name: item.combo.name || '',
            price: item.combo.price || 0,
            quantity: item.quantity || 1,
            image: item.combo.image || '',
          };
        } else if (item.product) {
          // ✅ Đây là product
          const productId = item.product._id || item.product.id;
          return {
            productId: productId || undefined,
            name: item.product.name || '',
            price: item.product.price || 0,
            quantity: item.quantity || 1,
            image: item.product.image || '',
          };
        } else {
          // ⚠️ Không có cả product và combo
          console.warn('⚠️ Cart item has neither product nor combo:', item);
          return {
            name: item.name || '',
            price: item.price || 0,
            quantity: item.quantity || 1,
            image: item.image || '',
          };
        }
      });

      const total = items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      console.log('📤 Sending cart to server:', { itemsCount: items.length, total });
      const response = await axios.post(`${API_URL}/api/cart/save`, {
        items,
        total,
      });

      console.log('📥 Cart save response:', response.data);
      const responseData = response.data as { data?: CartData; success?: boolean; message?: string };
      return responseData.data || { items, total };
    } catch (error) {
      console.error('Failed to save cart to server:', error);
      throw error;
    }
  }

  /**
   * Lấy cart từ server
   */
  async getCart(): Promise<CartData> {
    try {
      console.log('📤 Getting cart from server...');
      const response = await axios.get(`${API_URL}/api/cart`);
      console.log('📥 Cart get response:', response.data);
      const responseData = response.data as { data?: CartData; success?: boolean; message?: string };
      return responseData.data || { items: [], total: 0 };
    } catch (error: any) {
      console.error('❌ Failed to get cart from server:', error.response?.data || error.message);
      return { items: [], total: 0 };
    }
  }

  /**
   * Xóa cart trên server
   */
  async clearCart(): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/cart`);
    } catch (error) {
      console.error('Failed to clear cart on server:', error);
      // Không throw error, chỉ log
    }
  }

  /**
   * Sync cart từ server về localStorage
   * Merge với cart hiện tại trong localStorage
   */
  async syncCartFromServer(): Promise<any[]> {
    try {
      const serverCart = await this.getCart();
      const localCart = JSON.parse(localStorage.getItem('cartItems') || '[]');

      // Nếu server cart có items, ưu tiên server cart
      if (serverCart.items && serverCart.items.length > 0) {
        // Transform server cart items về localStorage format
        // ✅ Phân biệt product và combo dựa trên productId/comboId
        const transformedItems = serverCart.items.map((item: CartItem) => {
          if (item.comboId) {
            // ✅ Đây là combo
            return {
              combo: {
                _id: item.comboId,
                id: item.comboId,
                name: item.name,
                price: item.price,
                image: item.image,
              },
              quantity: item.quantity,
            };
          } else if (item.productId) {
            // ✅ Đây là product
            return {
              product: {
                _id: item.productId,
                id: item.productId,
                name: item.name,
                price: item.price,
                image: item.image,
              },
              quantity: item.quantity,
            };
          } else {
            // ⚠️ Không có cả productId và comboId
            console.warn('⚠️ Server cart item has neither productId nor comboId:', item);
            return {
              product: {
                _id: '',
                id: '',
                name: item.name,
                price: item.price,
                image: item.image,
              },
              quantity: item.quantity,
            };
          }
        });

        localStorage.setItem('cartItems', JSON.stringify(transformedItems));
        const count = transformedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        localStorage.setItem('cartCount', String(count));
        window.dispatchEvent(new Event('storage'));

        return transformedItems;
      }

      // Nếu server cart rỗng, giữ nguyên local cart
      return localCart;
    } catch (error) {
      console.error('Failed to sync cart from server:', error);
      return JSON.parse(localStorage.getItem('cartItems') || '[]');
    }
  }
}

export default new CartService();

