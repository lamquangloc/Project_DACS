export const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number') return '0 ₫';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}; 