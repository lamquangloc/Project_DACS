export const getOrderStatusText = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
};

export const getPaymentStatusText = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'Chưa thanh toán';
    case 'PAID':
      return 'Đã thanh toán';
    case 'FAILED':
      return 'Thanh toán thất bại';
    default:
      return status;
  }
};

export const getOrderStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'CONFIRMED':
      return 'processing';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
}; 