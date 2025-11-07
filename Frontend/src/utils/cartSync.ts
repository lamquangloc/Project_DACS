import cartService from '../services/cartService';

/**
 * Sync cart lên server khi thay đổi
 * Được gọi sau mỗi lần thay đổi cart trong localStorage
 */
export const syncCartToServer = async (cartItems: any[]): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // Chưa đăng nhập, không sync
      return;
    }

    // Debounce: Chỉ sync sau 500ms kể từ lần thay đổi cuối
    // Tránh gọi API quá nhiều lần
    if ((window as any).cartSyncTimeout) {
      clearTimeout((window as any).cartSyncTimeout);
    }

    (window as any).cartSyncTimeout = setTimeout(async () => {
      try {
        const result = await cartService.saveCart(cartItems);
        console.log('✅ Cart synced to server:', result);
      } catch (error) {
        console.error('❌ Failed to sync cart to server:', error);
        // Không block UI, chỉ log error
      }
    }, 500);
  } catch (error) {
    console.error('Error in syncCartToServer:', error);
  }
};

/**
 * Load cart từ server khi user login
 * Merge với cart hiện tại trong localStorage
 */
export const loadCartFromServer = async (): Promise<any[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // Chưa đăng nhập, không load từ server
      console.log('⚠️ No token, skipping cart load from server');
      return JSON.parse(localStorage.getItem('cartItems') || '[]');
    }

    console.log('🔄 Loading cart from server...');
    const serverCartItems = await cartService.syncCartFromServer();
    console.log('✅ Cart loaded from server:', serverCartItems.length, 'items');
    return serverCartItems;
  } catch (error) {
    console.error('❌ Failed to load cart from server:', error);
    return JSON.parse(localStorage.getItem('cartItems') || '[]');
  }
};

/**
 * Clear cart trên server khi user logout hoặc clear cart
 */
export const clearCartOnServer = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    await cartService.clearCart();
    console.log('✅ Cart cleared on server');
  } catch (error) {
    console.error('Failed to clear cart on server:', error);
  }
};

