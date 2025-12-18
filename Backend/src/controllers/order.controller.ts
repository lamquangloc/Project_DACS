import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { AppError } from '../middleware/error.middleware';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { generateOrderCode } from '../utils/codeGenerator';
import { vnpay } from '../utils/vnpay';
import { vietqr } from '../utils/vietqr';
import { format } from 'date-fns';
import { ProductCode, VnpLocale } from 'vnpay';
import {
  getFullAddressFromWardId,
  getProvinceById,
  getDistrictById,
  getWardsByDistrictId,
  findWardByName,
  normalizeName
} from '../utils/oapi-vn';

const prisma = new PrismaClient();

export class OrderController {
  static async createOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const { userId, items, total, address, phoneNumber, note, paymentStatus, status, provinceCode, provinceName, districtCode, districtName, wardCode, wardName } = req.body;

      // ✅ Helper: Normalize province name (TP.HCM -> Thành phố Hồ Chí Minh)
      const normalizeProvinceName = (name: string | undefined): string => {
        if (!name) return '';
        const normalized = name.trim();
        // Map các tên viết tắt phổ biến
        const provinceMap: Record<string, string> = {
          'tp.hcm': 'Thành phố Hồ Chí Minh',
          'tp hcm': 'Thành phố Hồ Chí Minh',
          'hcm': 'Thành phố Hồ Chí Minh',
          'sài gòn': 'Thành phố Hồ Chí Minh',
          'saigon': 'Thành phố Hồ Chí Minh',
          'hà nội': 'Thành phố Hà Nội',
          'hanoi': 'Thành phố Hà Nội',
          'hn': 'Thành phố Hà Nội',
          'đà nẵng': 'Thành phố Đà Nẵng',
          'danang': 'Thành phố Đà Nẵng',
        };
        
        const lowerName = normalized.toLowerCase();
        if (provinceMap[lowerName]) {
          return provinceMap[lowerName];
        }
        
        // Nếu đã là tên đầy đủ, giữ nguyên
        return normalized;
      };
      
      const normalizedProvinceName = normalizeProvinceName(provinceName);

      // Validate required fields
      if (!userId || !items || !total || !address || !phoneNumber || !provinceCode || !normalizedProvinceName || !districtCode || !districtName || !wardCode || !wardName) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      // Chuẩn hóa tên + mã tỉnh/thành, quận/huyện, phường/xã từ mã code (nếu có)
      // Ưu tiên wardCode → từ ward suy ra đúng quận & tỉnh (tránh case Thủ Đức bị thành Quận 1 nếu districtCode sai)
      let finalProvinceName = provinceName || '';
      let finalDistrictName = districtName || '';
      let finalWardName = wardName || '';
      let finalProvinceCode = provinceCode || '';
      let finalDistrictCode = districtCode || '';
      let finalWardCode = wardCode || '';

      try {
        if (wardCode && districtCode) {
          // Nếu có wardCode và districtCode thì dùng API để lấy đầy đủ ward/district/province
          const fullAddress = await getFullAddressFromWardId(wardCode, districtCode);
          if (fullAddress) {
            if (fullAddress.ward) {
              finalWardName = fullAddress.ward.name;
              finalWardCode = fullAddress.ward.id;
            }
            if (fullAddress.district) {
              finalDistrictName = fullAddress.district.name;
              finalDistrictCode = fullAddress.district.id;
            }
            if (fullAddress.province) {
              finalProvinceName = fullAddress.province.name;
              finalProvinceCode = fullAddress.province.id;
            }
          }
        } else {
          // Fallback: không có wardCode, dùng districtCode / provinceCode nếu có
          if (districtCode && provinceCode) {
            const district = await getDistrictById(districtCode, provinceCode);
            if (district) {
              finalDistrictName = district.name;
              finalDistrictCode = district.id;
            }
          }

          if (provinceCode) {
            const province = await getProvinceById(provinceCode);
            if (province) {
              finalProvinceName = province.name;
              finalProvinceCode = province.id;
            }
          }
        }
      } catch (addrError) {
        console.error('Error normalizing address from codes (createOrder):', addrError);
        // Nếu lỗi, giữ finalProvinceName/finalDistrictName/finalWardName như giá trị fallback ban đầu
      }

      // Get the next order number
      const sequence = await prisma.sequence.upsert({
        where: { name: 'order' },
        update: { value: { increment: 1 } },
        create: { name: 'order', value: 1 }
      });

      // Generate order code
      const orderCode = generateOrderCode(sequence.value);

      // Create order with items
      const order = await prisma.order.create({
        data: {
          orderNumber: sequence.value,
          orderCode,
          userId,
          total,
          address,
          provinceCode,
          provinceName,
          districtCode,
          districtName,
          wardCode,
          wardName,
          phoneNumber,
          note,
          paymentStatus: paymentStatus || 'PENDING',
          status: status || 'PENDING',
          items: {
            create: items.map((item: any) => {
              // ✅ Đảm bảo comboId không bị nhầm thành productId
              // Nếu có cả productId và comboId, ưu tiên comboId (vì 1 item chỉ có thể là product HOẶC combo)
              let productId = null;
              let comboId = null;
              
              if (item.comboId) {
                // ✅ Có comboId → đây là combo, không phải product
                comboId = item.comboId;
                productId = null;
                console.log('✅ Order item is COMBO:', comboId);
              } else if (item.productId) {
                // ✅ Có productId → đây là product
                productId = item.productId;
                comboId = null;
                console.log('✅ Order item is PRODUCT:', productId);
              } else {
                // ⚠️ Không có cả hai → có thể là lỗi
                console.warn('⚠️ Order item has neither productId nor comboId:', item);
              }
              
              return {
                productId,
                comboId,
                quantity: item.quantity,
                price: item.price
              };
            })
          }
        },
        include: {
          items: {
            include: {
              product: true,
              combo: true
            }
          },
          user: true
        }
      });

      // Nếu là VNPAY (paymentStatus === 'PAID')
      if (paymentStatus === 'PAID') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const ip = Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

        const paymentUrl = vnpay.buildPaymentUrl({
          vnp_Amount: (total/100) * 100,
          vnp_IpAddr: ip,
          vnp_TxnRef: String(order.id),
          vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
          vnp_OrderType: ProductCode.Other,
          vnp_ReturnUrl: 'http://localhost:3000/orders/vnpay-return',
          vnp_Locale: VnpLocale.VN,
          vnp_CreateDate: Number(format(new Date(), 'yyyyMMddHHmmss')),
          vnp_ExpireDate: Number(format(tomorrow, 'yyyyMMddHHmmss')),
        });
        return res.json({ paymentUrl });
      }

      // Nếu là COD
      res.status(201).json({
        status: 'success',
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
    return;
  }

  /**
   * Tạo đơn hàng từ chatbot (không yêu cầu đầy đủ thông tin như user order)
   */
  static async createOrderFromChatbot(req: Request, res: Response, _next: NextFunction) {
    try {
      const { 
        userId, 
        items, 
        totalAmount, 
        total, 
        status, 
        sessionId, 
        source, 
        address, 
        rawAddress,
        fullAddress,
        addressText,
        phoneNumber, 
        phone,
        sdt,
        note, 
        paymentStatus,
        provinceCode,
        provinceName,
        districtCode,
        districtName,
        wardCode,
        wardName
      } = req.body;

      // ✅ Debug: Log tất cả thông tin địa chỉ nhận được từ N8N
      console.log('📋 Address data received from N8N:', {
        provinceCode: provinceCode || '(missing)',
        provinceName: provinceName || '(missing)',
        districtCode: districtCode || '(missing)',
        districtName: districtName || '(missing)',
        wardCode: wardCode || '(missing)',
        wardName: wardName || '(missing)',
        address: address || rawAddress || fullAddress || addressText || '(missing)',
        phoneNumber: phoneNumber || phone || sdt || '(missing)'
      });

      // Chuẩn hóa tên + mã tỉnh/thành, quận/huyện, phường/xã từ mã code (nếu có)
      // Ưu tiên wardCode → từ ward suy ra đúng quận & tỉnh (tránh case Thủ Đức bị thành Quận 1 nếu districtCode sai)
      let finalProvinceName = provinceName || '';
      let finalDistrictName = districtName || '';
      let finalWardName = wardName || '';
      let finalProvinceCode = provinceCode || '';
      let finalDistrictCode = districtCode || '';
      // ✅ Đảm bảo wardCode là string (có thể rỗng nếu N8N không gửi)
      let finalWardCode = typeof wardCode === 'string' || typeof wardCode === 'number'
        ? String(wardCode).trim()
        : '';

      try {
        if (finalWardCode && districtCode) {
          // ⚠️ QUAN TRỌNG: Validate wardCode bằng cách gọi API để đảm bảo wardCode hợp lệ
          // Nếu có wardCode và districtCode thì dùng API để lấy đầy đủ ward/district/province
          console.log(`🔍 Validating wardCode: ${finalWardCode} with districtCode: ${districtCode}`);
          const fullAddress = await getFullAddressFromWardId(finalWardCode, districtCode);
          
          if (fullAddress && fullAddress.ward) {
            // ✅ Nếu API trả về đầy đủ, dùng data từ API (đảm bảo tính chính xác)
            finalWardName = fullAddress.ward.name;
            finalWardCode = fullAddress.ward.id;
            
            if (fullAddress.district) {
              finalDistrictName = fullAddress.district.name;
              finalDistrictCode = fullAddress.district.id;
            }
            
            if (fullAddress.province) {
              finalProvinceName = fullAddress.province.name;
              finalProvinceCode = fullAddress.province.id;
            }
            
            console.log(`✅ Validated wardCode: ${finalWardCode} -> ${finalWardName}`);
          } else {
            // ✅ Nếu API không tìm thấy wardCode → THỬ FALLBACK từ wardName + districtCode
            console.error(`❌ wardCode not found: ${finalWardCode}. Trying fallback with wardName + districtCode...`);

            let resolved = false;

            if (districtCode && wardName) {
              try {
                const matchedWard = await findWardByName(wardName, districtCode);
                
                if (matchedWard) {
                  finalWardName = matchedWard.name;
                  finalWardCode = matchedWard.id;
                  
                  // Get district info
                  const district = await getDistrictById(districtCode);
                  if (district) {
                    finalDistrictName = district.name;
                    finalDistrictCode = district.id;
                    
                    // Get province info
                    const province = await getProvinceById(district.provinceId);
                    if (province) {
                      finalProvinceName = province.name;
                      finalProvinceCode = province.id;
                    }
                  }
                  
                  resolved = true;
                  console.log('✅ Resolved invalid wardCode using wardName + districtCode fallback:', {
                    originalWardCode: wardCode,
                    wardNameInput: wardName,
                    finalWardName,
                    finalWardCode,
                    districtCode,
                  });
                }
              } catch (fallbackErr) {
                console.error('⚠️ Error while trying to resolve wardCode from wardName + districtCode fallback:', fallbackErr);
              }
            }

            if (!resolved) {
              // Fallback thất bại → trả lỗi rõ ràng
              console.error(`❌ Could not resolve wardCode via fallback. Giving up.`);
              console.error(`📋 Full request body for debugging:`, JSON.stringify({
                wardCode,
                wardName,
                districtCode,
                districtName,
                provinceCode,
                provinceName
              }, null, 2));

              return res.status(400).json({
                success: false,
                status: 'error',
                error: 'WardCode not found',
                message: `Mã phường/xã không tồn tại: ${wardCode}. Vui lòng kiểm tra lại thông tin địa chỉ.`,
                details: {
                  wardCode: wardCode,
                  wardName: wardName || '(missing)',
                  districtCode: districtCode || '(missing)',
                  districtName: districtName || '(missing)',
                  provinceCode: provinceCode || '(missing)',
                  provinceName: provinceName || '(missing)',
                  suggestion: 'Có thể wardCode không đúng hoặc không tồn tại trong hệ thống. Vui lòng kiểm tra lại thông tin địa chỉ đã thu thập từ user.'
                }
              });
            }
          }
        } else if (!finalWardCode && districtCode && wardName) {
          // Fallback: KHÔNG có wardCode, cố gắng suy ra từ wardName + districtCode
          try {
            const matchedWard = await findWardByName(wardName, districtCode);
            
            if (matchedWard) {
              finalWardName = matchedWard.name;
              finalWardCode = matchedWard.id;
              
              // Get district info
              const district = await getDistrictById(districtCode);
              if (district) {
                finalDistrictName = district.name;
                finalDistrictCode = district.id;
                
                // Get province info
                const province = await getProvinceById(district.provinceId);
                if (province) {
                  finalProvinceName = province.name;
                  finalProvinceCode = province.id;
                }
              }
              
              console.log('✅ Derived wardCode from wardName + districtCode:', {
                wardNameInput: wardName,
                finalWardName,
                finalWardCode,
              });
            } else {
              console.warn('⚠️ Could not derive wardCode from wardName + districtCode', {
                wardName,
                districtCode,
              });
            }
          } catch (err) {
            console.error('Error deriving wardCode:', err);
          }
        } else {
          // Fallback: chỉ có districtCode hoặc provinceCode
          if (districtCode && provinceCode) {
            const district = await getDistrictById(districtCode, provinceCode);
            if (district) {
              finalDistrictName = district.name;
              finalDistrictCode = district.id;
            }
          }

          if (provinceCode) {
            const province = await getProvinceById(provinceCode);
            if (province) {
              finalProvinceName = province.name;
              finalProvinceCode = province.id;
            }
          }
        }
      } catch (addrError) {
        console.error('Error normalizing address from codes (chatbot createOrderFromChatbot):', addrError);
        // Nếu lỗi, giữ nguyên giá trị fallback (provinceName/districtName/wardName từ body hoặc chuỗi rỗng)
      }

      // Gom thông tin địa chỉ / số điện thoại từ nhiều key có thể có trong body (tuỳ n8n mapping)
      const inputPhoneNumber: string | undefined =
        phoneNumber || phone || sdt;

      const inputAddressDetail: string | undefined =
        address || rawAddress || fullAddress || addressText;

      // Validation (ít field hơn, phù hợp với chatbot)
      // Kiểm tra totalAmount/total: phải là số và > 0 (không chỉ truthy)
      const finalTotal = totalAmount !== undefined && totalAmount !== null ? Number(totalAmount) : (total !== undefined && total !== null ? Number(total) : null);
      
      // Kiểm tra tất cả điều kiện
      if (!userId) {
        return res.status(400).json({
          success: false,
          status: 'error',
          error: 'Missing required fields',
          message: 'Thiếu thông tin bắt buộc: userId',
          details: {
            hasUserId: false,
            userId: userId
          }
        });
      }

      // ✅ QUAN TRỌNG: Validate userId có tồn tại trong database
      // Tránh lỗi Prisma "Field user is required to return data, got `null` instead"
      try {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });

        if (!userExists) {
          return res.status(400).json({
            success: false,
            status: 'error',
            error: 'Invalid userId',
            message: `User với userId "${userId}" không tồn tại trong hệ thống`,
            details: {
              userId: userId,
              suggestion: 'Kiểm tra lại userId được gửi từ N8N. Có thể userId bị lấy từ Simple Memory hoặc context cũ.'
            }
          });
        }
      } catch (error) {
        console.error('Error validating userId:', error);
        return res.status(500).json({
          success: false,
          status: 'error',
          error: 'Database error',
          message: 'Lỗi khi kiểm tra userId trong database',
          details: {
            userId: userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
      
      // Parse items nếu nó là string hoặc object
      let parsedItems = items;
      
      // Xử lý trường hợp items là string
      if (typeof items === 'string') {
        // Nếu là "[object Object]" - có nghĩa là object đã bị convert thành string sai cách
        if (items === '[object Object]' || items.startsWith('[object')) {
          return res.status(400).json({
            success: false,
            status: 'error',
            error: 'Invalid items format',
            message: 'Items là object nhưng bị convert thành string sai cách. Trong n8n, cần dùng JSON.stringify() hoặc để n8n tự serialize.',
            details: {
              hasItems: !!items,
              itemsType: typeof items,
              itemsValue: items,
              suggestion: 'Trong n8n JSON body, dùng {{ $json.items }} (n8n sẽ tự serialize array thành JSON)'
            }
          });
        }
        
        // Thử parse JSON string
        try {
          parsedItems = JSON.parse(items);
        } catch (e) {
          return res.status(400).json({
            success: false,
            status: 'error',
            error: 'Invalid items format',
            message: 'Items là string nhưng không phải JSON hợp lệ',
            details: {
              hasItems: !!items,
              itemsType: typeof items,
              itemsValue: items?.substring(0, 200), // First 200 chars for debugging
              parseError: e instanceof Error ? e.message : 'Unknown error'
            }
          });
        }
      }
      
      // Xử lý trường hợp items là object (single item) - convert thành array
      if (parsedItems && typeof parsedItems === 'object' && !Array.isArray(parsedItems)) {
        // Nếu là single item object, convert thành array
        if (parsedItems.productId || parsedItems.comboId) {
          parsedItems = [parsedItems];
        } else {
          return res.status(400).json({
            success: false,
            status: 'error',
            error: 'Invalid items format',
            message: 'Items là object nhưng không phải item hợp lệ (thiếu productId hoặc comboId)',
            details: {
              hasItems: !!items,
              itemsType: typeof items,
              parsedItemsType: typeof parsedItems,
              parsedItemsKeys: Object.keys(parsedItems),
              parsedItemsValue: parsedItems
            }
          });
        }
      }
      
      if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
        return res.status(400).json({
          success: false,
          status: 'error',
          error: 'Missing required fields',
          message: 'Thiếu thông tin bắt buộc: items (phải là array và có ít nhất 1 item)',
          details: {
            hasItems: !!items,
            isArray: Array.isArray(parsedItems),
            itemsLength: parsedItems?.length || 0,
            itemsType: typeof items,
            parsedItemsType: typeof parsedItems,
            originalItemsType: typeof items
          }
        });
      }
      
      // Sử dụng parsedItems thay vì items từ đây
      const itemsToUse = parsedItems;
      
      // Helper: chuẩn hoá item từ JSON của n8n về format backend
      const normalizeItemIds = (item: any) => {
        if (!item) return { productId: null, comboId: null };

        // Một số flow trong n8n gửi về:
        // - { id, type: 'product' | 'combo', ... }
        // - { productId, ... } hoặc { comboId, ... } (đã đúng chuẩn)
        let productId: string | null = item.productId || null;
        let comboId: string | null = item.comboId || null;

        // Nếu chưa có productId / comboId nhưng có id + type → map sang đúng field
        if (!productId && !comboId && item.id) {
          if (item.type === 'combo' || item.itemType === 'combo') {
            comboId = item.id;
          } else {
            // Mặc định coi là product nếu không ghi rõ
            productId = item.id;
          }
        }

        return { productId, comboId };
      };
      
      // Validate items format (sau khi đã parse)
      const validItems = itemsToUse && Array.isArray(itemsToUse)
        ? itemsToUse.filter((item: any) => {
            const { productId, comboId } = normalizeItemIds(item);
            // ✅ QUAN TRỌNG: Validate productId/comboId có tồn tại trong database
            if (!productId && !comboId) {
              console.warn('⚠️ Order item has neither productId nor comboId:', item);
              return false;
            }
            if (!item.quantity || !item.price) {
              console.warn('⚠️ Order item missing quantity or price:', item);
              return false;
            }
            return true;
          })
        : [];
      
      // ✅ QUAN TRỌNG: Validate productId/comboId có tồn tại trong database
      for (const item of validItems) {
        const { productId, comboId } = normalizeItemIds(item);
        if (productId) {
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true }
          });
          if (!product) {
            console.error('❌ Product not found:', productId);
            return res.status(400).json({
              success: false,
              status: 'error',
              error: 'Invalid productId',
              message: `Sản phẩm với ID "${productId}" không tồn tại trong hệ thống`,
              details: { productId, item }
            });
          }
        }
        if (comboId) {
          const combo = await prisma.combo.findUnique({
            where: { id: comboId },
            select: { id: true, name: true }
          });
          if (!combo) {
            console.error('❌ Combo not found:', comboId);
            return res.status(400).json({
              success: false,
              status: 'error',
              error: 'Invalid comboId',
              message: `Combo với ID "${comboId}" không tồn tại trong hệ thống`,
              details: { comboId, item }
            });
          }
        }
      }
      
      if (validItems.length === 0) {
        return res.status(400).json({
          success: false,
          status: 'error',
          error: 'Invalid items format',
          message: 'Items phải có productId hoặc comboId, quantity, và price',
          details: {
            itemsLength: itemsToUse?.length || 0,
            validItemsLength: validItems.length,
            firstItem: itemsToUse?.[0] || null,
            firstItemKeys: itemsToUse?.[0] ? Object.keys(itemsToUse[0]) : [],
            sampleItems: itemsToUse?.slice(0, 3) || [],
            allItemsHaveProductId: itemsToUse?.every((item: any) => item?.productId) || false,
            allItemsHaveComboId: itemsToUse?.every((item: any) => item?.comboId) || false,
            itemsWithProductId: itemsToUse?.filter((item: any) => item?.productId).length || 0,
            itemsWithComboId: itemsToUse?.filter((item: any) => item?.comboId).length || 0
          }
        });
      }
      
      if (finalTotal === null || isNaN(finalTotal) || finalTotal <= 0) {
        return res.status(400).json({
          success: false,
          status: 'error',
          error: 'Missing required fields',
          message: 'Thiếu thông tin bắt buộc: totalAmount (phải là số và > 0)',
          details: {
            hasTotal: !!(totalAmount || total),
            totalAmountValue: totalAmount,
            totalValue: total,
            finalTotalValue: finalTotal,
            totalAmountType: typeof totalAmount,
            totalType: typeof total,
            isNaN: finalTotal !== null && finalTotal !== undefined ? isNaN(finalTotal) : true,
            isLessOrEqualZero: finalTotal !== null && finalTotal !== undefined ? finalTotal <= 0 : true
          }
        });
      }


      // Get the next order number
      const sequence = await prisma.sequence.upsert({
        where: { name: 'order' },
        update: { value: { increment: 1 } },
        create: { name: 'order', value: 1 }
      });

      // Generate order code
      const orderCode = generateOrderCode(sequence.value);

      // Tạo order với default values cho các field không bắt buộc
      const order = await prisma.order.create({
        data: {
          orderNumber: sequence.value,
          orderCode,
          userId,
          total: Number(finalTotal),
          // Default values cho chatbot orders (có thể cập nhật sau)
          address: address || 'Chưa có địa chỉ - Đơn từ chatbot',
          phoneNumber: phoneNumber || 'Chưa có số điện thoại',
          provinceCode: provinceCode || '',
          provinceName: provinceName || '',
          districtCode: districtCode || '',
          districtName: districtName || '',
          wardCode: wardCode || '',
          wardName: wardName || '',
          note: note || `Đơn từ chatbot${sessionId ? ` (session: ${sessionId})` : ''}${source ? ` - ${source}` : ''}`,
          paymentStatus: paymentStatus || 'PENDING',
          status: status || 'PENDING',
          items: {
            create: validItems.map((item: any) => {
              const { productId, comboId } = normalizeItemIds(item);
              
              return {
                productId: productId || null,
                comboId: comboId || null,
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0
              };
            })
          }
        },
        include: {
          items: {
            include: {
              product: true,
              combo: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });

      // Generate VietQR code cho đơn hàng
      let qrCodeData = null;
      try {
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        const callbackUrl = `${backendUrl}/api/payments/vietqr/callback`;
        
        qrCodeData = await vietqr.generateQRCode({
          orderId: order.id,
          orderCode: order.orderCode,
          amount: order.total,
          content: `Thanh toan don hang ${order.orderCode}`,
          callbackUrl,
        });
        
        console.log('✅ VietQR code generated:', {
          orderId: order.id,
          orderCode: order.orderCode,
          qrCodeUrl: qrCodeData.qrCodeUrl,
        });
      } catch (error) {
        console.error('⚠️ Error generating VietQR code:', error);
        // Không fail đơn hàng nếu không generate được QR code
      }

      // ✅ QUAN TRỌNG: Tự động xóa giỏ hàng sau khi tạo đơn thành công (backup solution nếu AI không gọi carts Clear)
      try {
        const { CartService } = await import('../services/cart.service');
        const cartService = new CartService();
        await cartService.clearCart(userId);
        console.log('✅ Cart automatically cleared after order creation:', {
          userId,
          orderCode: order.orderCode
        });
      } catch (clearError) {
        console.error('⚠️ Error clearing cart after order creation (non-critical):', clearError);
        // Không fail đơn hàng nếu không clear được cart (AI sẽ gọi carts Clear)
      }

      return res.status(201).json({
        success: true,
        status: 'success',
        message: 'Order created successfully from chatbot',
        data: {
          id: order.id,
          orderCode: order.orderCode,
          userId: order.userId,
          items: order.items,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          address: order.address,
          phoneNumber: order.phoneNumber,
          provinceCode: order.provinceCode,
          provinceName: order.provinceName,
          districtCode: order.districtCode,
          districtName: order.districtName,
          wardCode: order.wardCode,
          wardName: order.wardName,
          note: order.note,
          createdAt: order.createdAt,
          // ✅ Thêm QR code data vào response
          qrCode: qrCodeData ? {
            qrCodeUrl: qrCodeData.qrCodeUrl,
            qrDataUrl: qrCodeData.qrDataUrl,
            qrContent: qrCodeData.qrContent,
          } : null,
        },
        order: {
          id: order.id,
          orderCode: order.orderCode,
          userId: order.userId,
          items: order.items,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          address: order.address,
          phoneNumber: order.phoneNumber,
          provinceCode: order.provinceCode,
          provinceName: order.provinceName,
          districtCode: order.districtCode,
          districtName: order.districtName,
          wardCode: order.wardCode,
          wardName: order.wardName,
          note: order.note,
          // ✅ Thêm QR code data vào response
          qrCode: qrCodeData ? {
            qrCodeUrl: qrCodeData.qrCodeUrl,
            qrDataUrl: qrCodeData.qrDataUrl,
            qrContent: qrCodeData.qrContent,
          } : null,
        }
      });
    } catch (error) {
      console.error('Error creating order from chatbot:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      return res.status(500).json({
        success: false,
        status: 'error',
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined
      });
    }
  }

  static async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status ? OrderStatus[req.query.status as keyof typeof OrderStatus] : undefined;
      const result = await OrderService.getMyOrders(req.user.id, page, limit, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getMyOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const order = await OrderService.getMyOrderById(req.user.id, id);
      if (!order) {
        throw new AppError('Order not found', 404);
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status ? OrderStatus[req.query.status as keyof typeof OrderStatus] : undefined;
      const result = await OrderService.getAllOrders(undefined, undefined, status);
      res.json({ status: 'success', data: result });
    } catch (error) {
      console.error('Error getting orders:', error);
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tìm đơn hàng theo mã đơn (full hoặc 4 số cuối)
   * GET /api/orders/search/:orderCodeOrSuffix
   * Hoặc GET /api/orders/by-code/:orderCodeOrSuffix
   */
  static async getOrderByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderCodeOrSuffix } = req.params;
      const userId = (req as any).user?.id || (req as any).user?.userId; // Lấy từ auth middleware (nếu có)

      if (!orderCodeOrSuffix) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing order code or suffix'
        });
      }

      const order = await OrderService.getOrderByCode(orderCodeOrSuffix, userId);

      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: order
      });
    } catch (error) {
      console.error('Error finding order by code:', error);
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const { status } = req.body;
      // Lấy đơn hàng
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'Order not found' });
      }
      // Nếu không phải admin và không phải chủ đơn thì cấm
      if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền cập nhật đơn này!' });
      }
      if (!status || !Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid order status'
        });
      }
      const updatedOrder = await OrderService.updateOrderStatus(id, { status });
      if (!updatedOrder) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }
      return res.status(200).json({
        status: 'success',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async updatePaymentStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid payment status'
        });
      }

      const order = await OrderService.updatePaymentStatus(id, { paymentStatus });

      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: order
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get QR code for order
   * GET /api/orders/:id/qr-code
   */
  static async getOrderQRCode(req: Request, res: Response, _next: NextFunction) {
    try {
      const { id } = req.params;

      // Get order
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          status: 'error',
          message: 'Order not found'
        });
      }

      // Generate QR code
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const callbackUrl = `${backendUrl}/api/payments/vietqr/callback`;
      
      const qrCodeData = await vietqr.generateQRCode({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: order.total,
        content: `Thanh toan don hang ${order.orderCode}`,
        callbackUrl,
      });

      return res.status(200).json({
        success: true,
        status: 'success',
        data: {
          orderId: order.id,
          orderCode: order.orderCode,
          amount: order.total,
          qrCode: qrCodeData
        }
      });
    } catch (error) {
      console.error('Error getting QR code:', error);
      return res.status(500).json({
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async deleteOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const order = await OrderService.deleteOrder(id);

      res.json({ 
        message: 'Order deleted successfully',
        order 
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate the order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      // Chuẩn hóa tên + mã tỉnh/thành, quận/huyện, phường/xã từ mã code (nếu có)
      // Ưu tiên wardCode → từ ward suy ra đúng quận & tỉnh (tránh case Thủ Đức bị thành Quận 1 nếu districtCode sai)
      let finalProvinceName = updateData.provinceName || '';
      let finalDistrictName = updateData.districtName || '';
      let finalWardName = updateData.wardName || '';
      let finalProvinceCode = updateData.provinceCode || '';
      let finalDistrictCode = updateData.districtCode || '';
      let finalWardCode = updateData.wardCode || '';

      try {
        if (updateData.wardCode && updateData.districtCode) {
          // Nếu có wardCode và districtCode thì dùng API để lấy đầy đủ ward/district/province
          const fullAddress = await getFullAddressFromWardId(updateData.wardCode, updateData.districtCode);
          if (fullAddress) {
            if (fullAddress.ward) {
              finalWardName = fullAddress.ward.name;
              finalWardCode = fullAddress.ward.id;
            }
            if (fullAddress.district) {
              finalDistrictName = fullAddress.district.name;
              finalDistrictCode = fullAddress.district.id;
            }
            if (fullAddress.province) {
              finalProvinceName = fullAddress.province.name;
              finalProvinceCode = fullAddress.province.id;
            }
          }
        } else {
          // Fallback: không có wardCode, dùng districtCode / provinceCode nếu có
          if (updateData.districtCode && updateData.provinceCode) {
            const district = await getDistrictById(updateData.districtCode, updateData.provinceCode);
            if (district) {
              finalDistrictName = district.name;
              finalDistrictCode = district.id;
            }
          }

          if (updateData.provinceCode) {
            const province = await getProvinceById(updateData.provinceCode);
            if (province) {
              finalProvinceName = province.name;
              finalProvinceCode = province.id;
            }
          }
        }
      } catch (addrError) {
        console.error('Error normalizing address from codes (updateOrder):', addrError);
        // Nếu lỗi, giữ nguyên giá trị từ updateData
      }

      // Update order information
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          address: updateData.address,
          phoneNumber: updateData.phoneNumber,
          note: updateData.note,
          total: updateData.total,
          provinceCode: finalProvinceCode || null,
          provinceName: finalProvinceName || null,
          districtCode: finalDistrictCode || null,
          districtName: finalDistrictName || null,
          wardCode: finalWardCode || null,
          wardName: finalWardName || null,
          items: {
            deleteMany: {},
            create: updateData.items.map((item: any) => ({
              productId: item.productId || null,
              comboId: item.comboId || null,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true,
              combo: true
            }
          },
          user: true
        }
      });

      return res.status(200).json({
        status: 'success',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async vnpayReturn(req: Request, res: Response) {
    try {
      // Ép kiểu req.query về object thuần
      const queryObj = Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
      // Xác thực checksum
      const isValid = vnpay.verifyReturnUrl(queryObj as any);
      if (!isValid) {
        return res.status(400).json({ status: 'error', message: 'Invalid checksum' });
      }
      // Lấy orderId từ vnp_TxnRef
      const orderId = queryObj.vnp_TxnRef as string;
      if (!orderId) {
        return res.status(400).json({ status: 'error', message: 'Missing orderId in VNPAY return' });
      }
      // Luôn trả về order (kể cả khi vnp_ResponseCode khác '00')
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true, combo: true } },
          user: true
        }
      });
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'Order not found' });
      }
      // Nếu thanh toán thành công, cập nhật trạng thái
      const vnp_ResponseCode = queryObj.vnp_ResponseCode;
      if (vnp_ResponseCode === '00') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' }
        });
      }
      return res.json({ order });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
} 