/**
 * VietQR Service
 * Tạo QR code thanh toán theo chuẩn VietQR
 * 
 * Sử dụng VietQR.io API miễn phí:
 * - Format URL: https://img.vietqr.io/image/{bankCode}-{accountNo}-{template}.jpg
 * - Ví dụ: https://img.vietqr.io/image/vietinbank-113366668888-compact.jpg
 * - Templates: compact, compact2, qr_only, print
 * 
 * Tài liệu: https://www.vietqr.io/
 * - Public Access: MIỄN PHÍ (không cần đăng ký)
 * - Registered: MIỄN PHÍ (cần đăng ký tài khoản)
 */

interface VietQRConfig {
  accountNo: string; // Số tài khoản ngân hàng
  accountName: string; // Tên chủ tài khoản
  bankCode: string; // Mã ngân hàng (ví dụ: VCB, TCB, VPB, etc.)
  template?: string; // Template QR code (compact2 hoặc qr_only)
}

interface GenerateQRCodeParams {
  orderId: string;
  orderCode: string;
  amount: number; // Số tiền (VND)
  content?: string; // Nội dung thanh toán (mặc định: mã đơn hàng)
  callbackUrl?: string; // URL để nhận callback khi thanh toán thành công
}

export class VietQRService {
  private config: VietQRConfig;
  private baseUrl: string;

  constructor(config: VietQRConfig) {
    this.config = config;
    // VietQR.io Image API base URL (MIỄN PHÍ, không cần API key)
    this.baseUrl = 'https://img.vietqr.io/image';
  }

  /**
   * Generate QR code URL từ thông tin đơn hàng
   * Sử dụng VietQR.io Image API (MIỄN PHÍ, không cần API key)
   * 
   * Format: https://img.vietqr.io/image/{bankCode}-{accountNo}-{template}.jpg
   * 
   * @param params Thông tin đơn hàng
   * @returns QR code URL và thông tin liên quan
   */
  async generateQRCode(params: GenerateQRCodeParams): Promise<{
    qrCodeUrl: string; // URL của QR code image
    qrDataUrl: string; // Data URL (base64) của QR code
    qrContent: string; // Nội dung QR code (để scan)
  }> {
    const { orderCode, amount, content } = params;

    // Nội dung thanh toán (hiển thị trên app ngân hàng)
    const paymentContent = content || `Thanh toan don hang ${orderCode}`;

    try {
      // ✅ Sử dụng VietQR.io Image API (MIỄN PHÍ, không cần đăng ký)
      // Format: https://img.vietqr.io/image/{bankCode}-{accountNo}-{template}.jpg
      // 
      // Lưu ý: 
      // - Bank code phải là tên ngân hàng (ví dụ: vietinbank, vietcombank, techcombank)
      // - Hoặc mã ngân hàng (ví dụ: 970415 cho VietinBank)
      // - Template: compact, compact2, qr_only, print
      
      // Convert bank code sang format VietQR.io
      // Ví dụ: VCB -> vietcombank, VPB -> vietinbank, TCB -> techcombank
      const bankCodeFormatted = this.formatBankCode(this.config.bankCode);
      const template = this.config.template || 'compact2';
      
      // ✅ Tự động điền số tiền và nội dung vào QR theo chuẩn VietQR.io
      // Format đầy đủ: https://img.vietqr.io/image/{bankCode}-{accountNo}-{template}.jpg?amount={amount}&addInfo={content}
      const query = new URLSearchParams();
      if (amount && amount > 0) {
        query.set('amount', String(Math.round(amount)));
      }
      if (paymentContent) {
        query.set('addInfo', paymentContent);
      }

      const queryString = query.toString();

      // Tạo QR code URL theo format VietQR.io (kèm amount + addInfo nếu có)
      const qrCodeUrl = `${this.baseUrl}/${bankCodeFormatted}-${this.config.accountNo}-${template}.jpg${queryString ? `?${queryString}` : ''}`;
      
      // QR content để scan (thông tin tham khảo)
      const qrContent = `banktransfer://${this.config.accountNo}?amount=${amount}&content=${encodeURIComponent(paymentContent)}`;

      console.log('✅ Generated VietQR code URL:', {
        bankCode: bankCodeFormatted,
        accountNo: this.config.accountNo,
        template,
        qrCodeUrl,
        amount,
        content: paymentContent
      });

      return {
        qrCodeUrl,
        qrDataUrl: qrCodeUrl, // Có thể convert sang base64 nếu cần
        qrContent,
      };
    } catch (error) {
      console.error('Error generating VietQR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Convert bank code sang format VietQR.io
   * Ví dụ: VCB -> vietcombank, VPB -> vietinbank, TCB -> techcombank
   */
  private formatBankCode(bankCode: string): string {
    // Map các mã ngân hàng phổ biến
    const bankCodeMap: Record<string, string> = {
      'VCB': 'vietcombank',
      'VPB': 'vietinbank',
      'TCB': 'techcombank',
      'ACB': 'acb',
      'BIDV': 'bidv',
      'VIB': 'vib',
      'TPB': 'tpbank',
      'MSB': 'msb',
      'HDB': 'hdbank',
      'VPBANK': 'vietinbank',
      'VIETCOMBANK': 'vietcombank',
      'TECHCOMBANK': 'techcombank',
       'MB': 'mbbank',
    };

    // Nếu đã là format đúng (chữ thường, không có dấu)
    if (bankCode.toLowerCase() === bankCode && !bankCode.match(/^[A-Z]{2,}$/)) {
      return bankCode.toLowerCase();
    }

    // Convert sang chữ thường và map
    const normalized = bankCode.toUpperCase();
    return bankCodeMap[normalized] || bankCode.toLowerCase();
  }


  /**
   * Verify payment callback từ VietQR
   */
  verifyCallback(data: any): {
    isValid: boolean;
    orderId?: string;
    amount?: number;
    transactionId?: string;
  } {
    // Verify signature nếu có
    // Tạm thời return true nếu có đủ thông tin
    if (data && data.orderId && data.amount) {
      return {
        isValid: true,
        orderId: data.orderId,
        amount: data.amount,
        transactionId: data.transactionId,
      };
    }

    return { isValid: false };
  }
}

// Export singleton instance
const vietqrConfig: VietQRConfig = {
  accountNo: process.env.VIETQR_ACCOUNT_NO || '1',
  accountName: process.env.VIETQR_ACCOUNT_NAME || 'ICE RESTAURANTS',
  bankCode: process.env.VIETQR_BANK_CODE || 'mbbank', // vietinbank, vietcombank, techcombank, etc.
  template: process.env.VIETQR_TEMPLATE || 'compact2', // compact, compact2, qr_only, print
};

export const vietqr = new VietQRService(vietqrConfig);

