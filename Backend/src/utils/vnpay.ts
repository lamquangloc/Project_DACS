import { VNPay, ignoreLogger, HashAlgorithm } from 'vnpay';


export const vnpay = new VNPay({
  tmnCode: '2SRAUQAP',
  secureSecret: 'QOND4DLDSEOA873JGZWWC0KISCRE330U',
  vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  testMode: true,
  hashAlgorithm: HashAlgorithm.SHA512,
  enableLog: true,
  loggerFn: ignoreLogger,
  endpoints: {
    paymentEndpoint: 'paymentv2/vpcpay.html',
    queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
    getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
  }
});