import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Collapse, Tag, Spin, Button, message } from 'antd';
import orderService from '../../services/orderService';
import comboService from '../../services/comboService';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { getImageUrl } from '../../utils/image';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

const statusText = {
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};
const statusColor = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  DELIVERING: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
};
const paymentText = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chưa thanh toán',
};
const paymentColor = {
  PAID: 'green',
  PENDING: 'orange',
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [itemDetails, setItemDetails] = useState<Map<string, any>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchOrder();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (order && order.items) {
      fetchItemDetails();
    }
    // eslint-disable-next-line
  }, [order]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await orderService.getById(id!, true);
      const orderData = res.data || res;
      console.log('📦 Order data from API:', orderData);
      console.log('📦 Order items:', orderData.items);
      if (orderData.items) {
        orderData.items.forEach((item: any, idx: number) => {
          console.log(`📦 Item ${idx}:`, {
            id: item.id,
            comboId: item.comboId,
            productId: item.productId,
            combo: item.combo,
            product: item.product
          });
        });
      }
      setOrder(orderData);
    } catch (e) {
      message.error('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemDetails = async () => {
    if (!order || !order.items) {
      console.log('⚠️ fetchItemDetails: No order or items');
      return;
    }
    
    const detailsMap = new Map<string, any>();
    
    // ✅ Fetch combo details cho TẤT CẢ items có comboId (kể cả khi đã có combo object)
    // Vì combo object từ backend có thể không đầy đủ hoặc image path không đúng
    const comboIds: string[] = [];
    order.items.forEach((item: any) => {
      // ✅ Lấy comboId từ item.comboId hoặc từ item.combo?.id
      let comboId = item.comboId || item.combo?.id;
      
      // ✅ Nếu không có comboId nhưng có productId và không có product object
      // → Có thể là comboId bị nhầm thành productId
      if (!comboId && item.productId && !item.product) {
        console.log('⚠️ Detected possible comboId in productId field:', item.productId);
        comboId = item.productId;
      }
      
      if (comboId && !comboIds.includes(comboId)) {
        comboIds.push(comboId);
      }
    });
    
    console.log('🔍 Fetching combo details for comboIds:', comboIds, 'from', order.items.length, 'items');
    
    if (comboIds.length === 0) {
      console.log('⚠️ No comboIds found in order items');
      return;
    }
    
    // Fetch tất cả combos song song để tăng tốc
    const fetchPromises = comboIds.map(async (comboId) => {
      try {
        console.log('🔄 Fetching combo:', comboId);
        const res = await comboService.getById(comboId);
        // ✅ res là ApiResponse<Combo>, cần lấy res.data để có Combo object
        const combo = (res as any).data || res;
        if (combo && combo.name) {
          // ✅ Lưu combo vào map kể cả khi không có image (sẽ dùng placeholder)
          console.log('✅ Fetched combo:', comboId, {
            name: combo.name,
            image: combo.image || 'no image',
            hasName: !!combo.name,
            hasImage: !!combo.image
          });
          return { comboId, combo };
        } else {
          console.warn('⚠️ Combo data is empty or missing name for comboId:', comboId, combo);
          return null;
        }
      } catch (e) {
        console.error('❌ Error fetching combo:', comboId, e);
        return null;
      }
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach((result) => {
      if (result && result.combo) {
        detailsMap.set(result.comboId, result.combo);
      }
    });
    
    console.log('📦 Final itemDetails map:', Array.from(detailsMap.entries()).map(([id, combo]) => ({
      id,
      name: combo.name,
      image: combo.image
    })));
    
    // ✅ Force update itemDetails để trigger re-render
    setItemDetails(new Map(detailsMap));
  };

  if (loading || !order) return <Spin style={{ margin: 40 }} />;

  return (
    <div style={{ maxWidth: 800, margin: '32px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32 }}>
      <ScrollToTopButton />
      <h2 style={{
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 700,
        color: '#1677ff',
        marginBottom: 32,
        letterSpacing: 1,
        borderBottom: '2px solid #e6f4ff',
        paddingBottom: 12
      }}>
        Chi tiết đơn hàng
      </h2>
      <Collapse 
        key={`collapse-${itemDetails.size}`}
        defaultActiveKey={['status', 'info', 'products', 'customer']}
        items={[
          {
            key: 'status',
            label: 'Trạng thái đơn hàng',
            children: (
              <>
          <div style={{ marginBottom: 8 }}>
            <b>Trạng thái đơn hàng:</b> <Tag color={statusColor[String(order.status) as keyof typeof statusColor]}>{statusText[String(order.status) as keyof typeof statusText]}</Tag>
          </div>
          <div>
            <b>Trạng thái thanh toán:</b> <Tag color={paymentColor[String(order.paymentStatus) as keyof typeof paymentColor]}>{paymentText[String(order.paymentStatus) as keyof typeof paymentText]}</Tag>
          </div>
              </>
            )
          },
          {
            key: 'info',
            label: 'Thông tin đơn hàng',
            children: (
              <>
          <div><b>Mã đơn hàng:</b> {order.orderCode}</div>
          <div><b>Ngày đặt:</b> {formatDate(order.createdAt)}</div>
          <div><b>Tổng tiền:</b> {formatCurrency(order.total)}</div>
              </>
            )
          },
          {
            key: 'products',
            label: 'Chi tiết sản phẩm',
            children: (
              <>
          {order.items.map((item: any) => {
                  // ✅ Lấy comboId từ item.comboId hoặc từ item.combo?.id
                  // ✅ Nếu không có comboId nhưng có productId và productId có thể là comboId bị nhầm
                  // → Kiểm tra xem productId có phải là comboId không (thử fetch combo với productId)
                  let comboId = item.comboId || item.combo?.id;
                  let isCombo = !!comboId;
                  
                  // ✅ Nếu không có comboId nhưng có productId, kiểm tra xem có phải combo không
                  // (Trường hợp comboId bị nhầm thành productId)
                  if (!comboId && item.productId && !item.product) {
                    // Có productId nhưng không có product object → có thể là comboId bị nhầm
                    console.log('⚠️ Item has productId but no product object, might be comboId:', item.productId);
                    // Thử dùng productId như comboId để fetch
                    comboId = item.productId;
                    isCombo = true;
                  }
                  
                  console.log('🎨 Rendering item:', {
                    itemId: item.id,
                    comboId,
                    isCombo,
                    hasComboObject: !!item.combo,
                    hasProductObject: !!item.product,
                    itemDetailsSize: itemDetails.size
                  });
                  
                  // ✅ Ưu tiên lấy từ itemDetails (đã fetch), sau đó từ item.product/combo, cuối cùng là empty object
                  let product = item.product || item.combo || {};
                  
                  // ✅ Nếu có comboId, luôn ưu tiên lấy từ itemDetails (đã fetch đầy đủ)
                  if (comboId) {
                    const fetchedCombo = itemDetails.get(comboId);
                    console.log('🔍 Checking fetchedCombo for comboId:', comboId, 'found:', !!fetchedCombo);
                    
                    if (fetchedCombo && fetchedCombo.name) {
                      // ✅ Ưu tiên dùng fetchedCombo nếu có name (kể cả khi không có image)
                      product = fetchedCombo;
                      // Merge image từ item.combo nếu fetchedCombo không có image
                      if (!product.image && item.combo?.image) {
                        product = { ...product, image: item.combo.image };
                      }
                      console.log('✅ Using fetched combo:', comboId, product.name, product.image || 'no image');
                    } else if (item.combo && item.combo.name) {
                      // Fallback: dùng combo từ item nếu có
                      product = item.combo;
                      console.log('⚠️ Using item.combo (not fetched yet):', comboId, product.name, product.image || 'no image');
                    } else {
                      console.log('❌ Combo not found in itemDetails and no item.combo:', comboId, 'item:', item);
                    }
                  }
                  
                  // ✅ Sử dụng getImageUrl để format image URL đúng (giống ComboPage)
                  let imageUrl = '/no-image.png';
                  if (product.image) {
                    // Format giống ComboPage: nếu là http thì giữ nguyên, nếu không thì thêm API_URL
                    if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
                      imageUrl = product.image;
                    } else {
                      imageUrl = getImageUrl(product.image);
                    }
                    console.log('🖼️ Image URL:', product.image, '→', imageUrl);
                  } else {
                    console.log('⚠️ No image for product:', product.name || 'Unknown');
                  }
                  
                  const productName = product.name || (isCombo ? 'Combo' : 'Sản phẩm');
                  console.log('📝 Final product name:', productName, 'isCombo:', isCombo);
                  
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                      <img src={imageUrl} alt={productName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginRight: 16 }} />
                <div style={{ flex: 1 }}>
                        <div><b>{productName}</b></div>
                  <div>Số lượng: {item.quantity} | Giá: {formatCurrency(item.price)} | Thành tiền: {formatCurrency(item.price * item.quantity)}</div>
                </div>
              </div>
            );
          })}
              </>
            )
          },
          {
            key: 'customer',
            label: 'Thông tin khách hàng',
            children: (
              <>
          <div><b>Người nhận:</b> {order.customerName || order.user?.name || ''}</div>
          <div><b>SĐT:</b> {order.phoneNumber}</div>
          <div><b>Địa chỉ:</b> {[
            order.address,
            order.wardName,
            order.districtName,
            order.provinceName
          ].filter(Boolean).join(', ')}</div>
              </>
            )
          }
        ]}
      />
      <Button style={{ marginTop: 24 }} onClick={() => navigate(-1)}>Quay lại</Button>
    </div>
  );
};

export default OrderDetailPage; 