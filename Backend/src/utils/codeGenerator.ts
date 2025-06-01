export const generateOrderCode = (orderNumber: number): string => {
  // Format: ORD-YYYYMMDD-XXXX
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = String(orderNumber).padStart(4, '0');
  
  return `ORD-${year}${month}${day}-${sequence}`;
}; 