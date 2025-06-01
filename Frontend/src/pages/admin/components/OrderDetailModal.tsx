import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, InputNumber, message, Button, Spin } from 'antd';
import { OrderService } from '../../../services/orderService';
import { productService } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import comboService from '../../../services/comboService';
import { Product } from '../../../types/product';
import { Category } from '../../../types/category';
import { Combo } from '../../../types/combo';
import { IOrder, OrderStatus, PaymentStatus, IOrderItem } from '../../../types/order';

const { Option } = Select;
const { TextArea } = Input;

interface OrderDetailModalProps {
  visible: boolean;
  order: IOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedItem extends IOrderItem {
  name: string;
  image: string;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCombo, setShowCombo] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.PENDING);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus || PaymentStatus.PENDING);
  const [loading, setLoading] = useState(false);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [districtList, setDistrictList] = useState<any[]>([]);
  const [wardList, setWardList] = useState<any[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    async function fetchAddressLists() {
    if (visible && order) {
      setPhoneNumber(order.phoneNumber || '');
      setNote(order.note || '');
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
        setProvinceCode(order.provinceCode || '');
        setDistrictCode(order.districtCode || '');
        setWardCode(order.wardCode || '');
        setProvinceName(order.provinceName || '');
        setDistrictName(order.districtName || '');
        setWardName(order.wardName || '');
        setAddressDetail(order.address || '');

        if (order.provinceCode) {
          const res1 = await fetch(`https://provinces.open-api.vn/api/p/${order.provinceCode}?depth=2`);
          const data1 = await res1.json();
          setDistrictList(data1.districts || []);
          if (order.districtCode) {
            const res2 = await fetch(`https://provinces.open-api.vn/api/d/${order.districtCode}?depth=2`);
            const data2 = await res2.json();
            setWardList(data2.wards || []);
            if (order.wardCode) {
              const selectedWard = (data2.wards || []).find((w: any) => String(w.code) === String(order.wardCode) || w.code === order.wardCode);
              setWardName(selectedWard ? selectedWard.name : '');
            }
          }
        }
      }
    }
    fetchAddressLists();
  }, [visible, order]);

  useEffect(() => {
    if (visible) {
      fetchInitialData();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCategory) {
      fetchProductsByCategory();
    }
  }, [selectedCategory]);

  // Fetch provinces on mount
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinceList(data));
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (provinceCode) {
      setLoadingAddress(true);
      fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
          setDistrictList(data.districts || []);
          setProvinceName(data.name);
          if (!order || !order.districtCode || String(order.provinceCode) !== String(provinceCode)) {
            setDistrictCode('');
            setWardCode('');
            setWardList([]);
          }
          setLoadingAddress(false);
        });
    } else {
      setDistrictList([]);
      setDistrictCode('');
      setWardList([]);
      setWardCode('');
    }
  }, [provinceCode]);

  // Fetch wards when district changes
  useEffect(() => {
    if (districtCode) {
      setLoadingAddress(true);
      fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
          setWardList(data.wards || []);
          setDistrictName(data.name);
          if (!order || !order.wardCode || String(order.districtCode) !== String(districtCode)) {
            setWardCode('');
          }
          setLoadingAddress(false);
        });
    } else {
      setWardList([]);
      setWardCode('');
    }
  }, [districtCode]);

  // Set ward name
  useEffect(() => {
    if (wardCode && wardList.length > 0) {
      const ward = wardList.find(w => String(w.code) === String(wardCode));
      setWardName(ward ? ward.name : '');
    } else {
      setWardName('');
    }
  }, [wardCode, wardList]);

  // Thêm useEffect khởi tạo selectedItems từ order.items khi mở modal
  useEffect(() => {
    if (visible && order && order.items) {
      // Khởi tạo selectedItems từ order.items
        const items = order.items.map(item => ({
          id: item.productId || item.comboId || '',
          productId: item.productId,
          comboId: item.comboId,
        name: '',
          price: item.price,
          quantity: item.quantity,
        image: '',
        orderId: order.id
        }));
        setSelectedItems(items);

      // Fetch chi tiết sản phẩm/combo để cập nhật name và image nếu cần
        const fetchItemDetails = async () => {
          try {
          const productIds = order.items.filter(i => i.productId).map(i => i.productId) as string[];
          const comboIds = order.items.filter(i => i.comboId).map(i => i.comboId) as string[];

            const [productsResponse, combosResponse] = await Promise.all([
              Promise.all(productIds.map(id => productService.getById(id))),
              Promise.all(comboIds.map(id => comboService.getById(id)))
            ]);

          setSelectedItems(prev =>
            prev.map(item => {
                if (item.productId) {
                const productRes = productsResponse.find(res => res.data?.id === item.productId);
                  if (productRes?.data) {
                    return {
                      ...item,
                      name: productRes.data.name || '',
                      image: productRes.data.image || ''
                    };
                  }
                }
                if (item.comboId) {
                const comboRes = combosResponse.find(res => res.data?.id === item.comboId);
                  if (comboRes?.data) {
                    return {
                      ...item,
                      name: comboRes.data.name || '',
                      image: comboRes.data.image || ''
                    };
                  }
                }
                return item;
              })
            );
          } catch (error) {
            console.error('Error fetching item details:', error);
            message.error('Có lỗi xảy ra khi tải thông tin sản phẩm');
          }
        };

        fetchItemDetails();
    }
  }, [visible, order]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, combosResponse] = await Promise.all([
        categoryService.getAll(),
        comboService.getAll(),
      ]);
      
      if (categoriesResponse?.status === 'success' && categoriesResponse.data?.categories) {
        const cats = categoriesResponse.data.categories;
        setCategories(cats);
        if (cats.length > 0 && !showCombo) {
          setSelectedCategory(cats[0].id);
        }
      }
      
      if (combosResponse?.status === 'success' && combosResponse.data?.items) {
        setCombos(combosResponse.data.items);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByCategory = async () => {
    if (!selectedCategory) {
      setProducts([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await productService.getByCategory(selectedCategory);
      
      if (response.status === 'success' && response.data) {
        const responseData = response.data as any;
        let productsData: Product[] = [];
        
        if (Array.isArray(responseData)) {
          productsData = responseData;
        } else if (responseData.data?.products) {
          productsData = responseData.data.products;
        } else if (responseData.data?.items) {
          productsData = responseData.data.items;
        } else if (responseData.products) {
          productsData = responseData.products;
        } else if (responseData.items) {
          productsData = responseData.items;
        }

        const filteredProducts = productsData.filter(product => {
          if (Array.isArray(product.categories)) {
            return product.categories.some(cat => cat.category.id === selectedCategory);
          }
          return false;
        });

        setProducts(filteredProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products by category:', error);
      message.error('Có lỗi xảy ra khi tải sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showCombo) {
      setProducts([]);
      setSelectedCategory('');
    }
  }, [showCombo]);

  const handleAddItem = (item: Product | Combo) => {
    if (!item?.image) return;
    const isCombo = (item as Combo).products !== undefined;
    setSelectedItems(prev => {
      const id = item.id;
      const existingItem = prev.find(i => i.id === id);
      if (existingItem) {
        return prev.map(i => 
          i.id === id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      if (isCombo) {
        return [...prev, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image ? item.image : '',
          comboId: item.id,
          orderId: order?.id || ''
        }];
      } else {
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
          image: item.image ? item.image : '',
          productId: item.id,
          orderId: order?.id || ''
      }];
      }
    });
  };

  const handleQuantityChange = (id: string, quantity: number | null) => {
    if (quantity === null) return;
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleUpdate = async () => {
    try {
      if (!order?.id) {
        message.error('Không tìm thấy mã đơn hàng');
        return;
      }

      if (!addressDetail.trim()) {
        message.error('Vui lòng nhập địa chỉ');
        return;
      }

      if (!phoneNumber.trim()) {
        message.error('Vui lòng nhập số điện thoại');
        return;
      }

      // Thêm debug log
      console.log('DEBUG:', { provinceCode, provinceName, districtCode, districtName, wardCode, wardName });

      if (!provinceCode || !provinceName || !districtCode || !districtName || !wardCode || !wardName) {
        message.error('Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã!');
        return;
      }

      setLoading(true);

      const orderItems = selectedItems.map(item => ({
        id: item.id,
        orderId: order.id,
        productId: item.productId,
        comboId: item.comboId,
        quantity: item.quantity,
        price: item.price
      }));

      const orderData = {
        items: orderItems,
        total: calculateTotal(),
        phoneNumber: phoneNumber.trim(),
        note: note.trim() || undefined,
        provinceCode: String(provinceCode),
        provinceName: provinceName,
        districtCode: String(districtCode),
        districtName: districtName,
        wardCode: String(wardCode),
        wardName: wardName,
        address: addressDetail.trim()
      };

      const orderService = new OrderService();
      
      try {
        console.log('Updating order with data:', orderData);
        
        // Update order information first
        const updateResponse = await orderService.update(order.id, orderData);
        console.log('Order update response:', updateResponse);
        
        if (updateResponse.status !== 'success') {
          throw new Error('Failed to update order information');
        }

        // Update order status if changed
        if (status !== order.status) {
          console.log('Updating order status to:', status);
          const statusResponse = await orderService.updateOrderStatus(order.id, status);
          console.log('Status update response:', statusResponse);
          
          if (statusResponse.status !== 'success') {
            throw new Error('Failed to update order status');
          }
        }
        
        // Update payment status if changed
        if (paymentStatus !== order.paymentStatus) {
          console.log('Updating payment status to:', paymentStatus);
          const paymentResponse = await orderService.updatePaymentStatus(order.id, paymentStatus);
          console.log('Payment status update response:', paymentResponse);
          
          if (paymentResponse.status !== 'success') {
            throw new Error('Failed to update payment status');
          }
        }

        message.success('Cập nhật đơn hàng thành công');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } catch (error: any) {
        console.error('Error updating order:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
          message.error(error.response.data.message || 'Không thể cập nhật đơn hàng');
      } else {
          message.error(error.message || 'Có lỗi xảy ra khi cập nhật đơn hàng');
        }
      }
    } catch (error: any) {
      console.error('Error in handleUpdate:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        message.error(error.response.data.message || 'Không thể cập nhật đơn hàng');
      } else {
      message.error(error.message || 'Có lỗi xảy ra khi cập nhật đơn hàng');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderProducts = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      );
    }

    if (showCombo) {
      return (
        <div className="grid grid-cols-4 gap-4">
          {combos.map(combo => (
            <div
              key={combo.id}
              className="relative cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              onClick={() => handleAddItem(combo)}
            >
              <img
                src={combo.image}
                alt={combo.name}
                className="w-full h-32 object-cover"
              />
              <div className="p-2 bg-white">
                <div className="font-semibold text-sm">{combo.name}</div>
                <div className="text-blue-600">{combo.price.toLocaleString()}đ</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!selectedCategory) return null;

    return (
      <div className="grid grid-cols-4 gap-4">
        {products.map(product => (
          <div
            key={product.id}
            className="relative cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            onClick={() => handleAddItem(product)}
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-32 object-cover"
            />
            <div className="p-2 bg-white">
              <div className="font-semibold text-sm">{product.name}</div>
              <div className="text-blue-600">{product.price.toLocaleString()}đ</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title="Chi tiết đơn hàng"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="back" onClick={onClose}>
          Quay lại
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleUpdate}
          loading={loading}
        >
          Lưu thay đổi
        </Button>
      ]}
    >
      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-1/2">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên người đặt</label>
            <Input
              placeholder="Khách hàng"
              value={order?.user?.name || ''}
              disabled
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
            <Select
              className="w-full mb-2"
              placeholder="Chọn tỉnh/thành phố"
              value={provinceCode || undefined}
              onChange={value => {
                setProvinceCode(String(value));
                const selected = provinceList.find(p => String(p.code) === String(value));
                setProvinceName(selected ? selected.name : '');
                setDistrictCode('');
                setDistrictName('');
                setWardCode('');
                setWardName('');
              }}
              showSearch
              optionFilterProp="children"
            >
              {provinceList.map((p) => (
                <Option key={p.code} value={String(p.code)}>{p.name}</Option>
              ))}
            </Select>
            <Select
              className="w-full mb-2"
              placeholder="Chọn quận/huyện"
              value={districtCode || undefined}
              onChange={value => {
                setDistrictCode(String(value));
                const selected = districtList.find(d => String(d.code) === String(value));
                setDistrictName(selected ? selected.name : '');
                setWardCode('');
                setWardName('');
              }}
              disabled={!provinceCode}
              showSearch
              optionFilterProp="children"
            >
              {districtList.map((d) => (
                <Option key={d.code} value={String(d.code)}>{d.name}</Option>
              ))}
            </Select>
            <Select
              className="w-full mb-2"
              placeholder="Chọn phường/xã"
              value={wardCode || undefined}
              onChange={value => {
                setWardCode(String(value));
                const selected = wardList.find(w => String(w.code) === String(value));
                if (selected && selected.name) {
                  setWardName(selected.name);
                } else {
                  setWardName('');
                }
              }}
              disabled={!districtCode}
              showSearch
              optionFilterProp="children"
            >
              {wardList.map((w) => (
                <Option key={w.code} value={String(w.code)}>{w.name}</Option>
              ))}
            </Select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
            <Input
              placeholder="Địa chỉ chi tiết (số nhà, tên đường)"
              value={addressDetail}
              onChange={e => setAddressDetail(e.target.value)}
            />
            {loadingAddress && <Spin className="ml-2" />}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <Input
              placeholder="Số điện thoại"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <Select
              className="w-full"
              value={status}
              onChange={value => setStatus(value)}
            >
              <Option value={OrderStatus.PENDING}>Đang chờ</Option>
              <Option value={OrderStatus.CONFIRMED}>Đã xác nhận</Option>
              <Option value={OrderStatus.DELIVERING}>Đang giao</Option>
              <Option value={OrderStatus.DELIVERED}>Đã giao</Option>
              <Option value={OrderStatus.CANCELLED}>Đã hủy</Option>
            </Select>
          </div>

          <div className="mb-4">
            <Select
              className="w-full"
              value={paymentStatus}
              onChange={(value: PaymentStatus) => setPaymentStatus(value)}
            >
              <Option value={PaymentStatus.PENDING}>Chưa thanh toán</Option>
              <Option value={PaymentStatus.PAID}>Đã thanh toán</Option>
              <Option value={PaymentStatus.FAILED}>Thanh toán thất bại</Option>
            </Select>
          </div>

          <div className="mb-4">
            <TextArea
              placeholder="Ghi chú"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
            />
          </div>

          <div className="mt-6">
            <div className="flex gap-2 mb-4">
              <button
                className={`px-4 py-2 rounded-lg ${!showCombo ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => {
                  setShowCombo(false);
                  if (categories.length > 0) {
                    setSelectedCategory(categories[0].id);
                  }
                }}
              >
                Danh mục
              </button>
              <button
                className={`px-4 py-2 rounded-lg ${showCombo ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => {
                  setShowCombo(true);
                  setSelectedCategory('');
                }}
              >
                Combo
              </button>
            </div>

            {!showCombo && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      selectedCategory === category.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              {renderProducts()}
            </div>
          </div>
        </div>

        {/* Right panel - Order details */}
        <div className="w-1/2">
          <h3 className="font-bold mb-4">Chi tiết đơn hàng</h3>
          <div className="space-y-4">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-gray-600">{item.price.toLocaleString()}đ</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <InputNumber
                    min={1}
                    value={item.quantity}
                    onChange={value => handleQuantityChange(item.id, value)}
                  />
                  <div className="font-semibold">
                    {(item.price * item.quantity).toLocaleString()}đ
                  </div>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-right">
            <div className="text-xl font-bold mb-4">
              Tổng tiền: {calculateTotal().toLocaleString()}đ
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OrderDetailModal; 