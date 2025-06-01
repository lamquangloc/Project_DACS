import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, InputNumber, message, Spin } from 'antd';
import userService from '../../../services/userService';
import { productService } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import comboService from '../../../services/comboService';
import { OrderService } from '../../../services/orderService';
import { User } from '../../../types/user';
import { Product } from '../../../types/product';
import { Category } from '../../../types/category';
import { Combo } from '../../../types/combo';
import { OrderStatus, PaymentStatus } from '../../../types/order';

const { Option } = Select;
const { TextArea } = Input;

interface CreateOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}



const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCombo, setShowCombo] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    isCombo?: boolean;
    product?: Product;
    combo?: Combo;
    comboId?: string;
    productId?: string;
  }>>([]);
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

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
          setDistrictCode('');
          setWardCode('');
          setWardList([]);
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
          setWardCode('');
          setLoadingAddress(false);
        });
    } else {
      setWardList([]);
      setWardCode('');
    }
  }, [districtCode]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [usersResponse, categoriesResponse, combosResponse] = await Promise.all([
        userService.getAll(),
        categoryService.getAll(),
        comboService.getAll(),
      ]);
      
      if (usersResponse && 'users' in usersResponse) {
        setUsers(usersResponse.users);
      }
      
      if (categoriesResponse?.status === 'success' && categoriesResponse.data?.categories) {
        const cats = categoriesResponse.data.categories;
        setCategories(cats);
        // Set first category as selected if available
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
      console.log('Products response for category:', selectedCategory, response);
      
      if (response.status === 'success' && response.data) {
        const responseData = response.data as any;
        let productsData: Product[] = [];
        
        // Handle different response structures
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

        // Filter products by selected category
        const filteredProducts = productsData.filter(product => {
          // Check if the product has categories array
          if (Array.isArray(product.categories)) {
            return product.categories.some(cat => cat.category.id === selectedCategory);
          }
          return false;
        });

        console.log('Filtered products for category:', selectedCategory, filteredProducts);
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

  // Clear products when switching to combo view
  useEffect(() => {
    if (showCombo) {
      setProducts([]);
      setSelectedCategory('');
    }
  }, [showCombo]);

  const handleAddItem = (item: Product | Combo) => {
    if (!item?.image) return;
    const isCombo = combos.some(c => c.id === item.id);
    setSelectedItems(prev => {
      const id = item.id;
      const existingItem = prev.find(i => i.id === id);
      let newItems;
      if (existingItem) {
        newItems = prev.map(i =>
          i.id === id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else if (isCombo) {
        newItems = [...prev, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image ? item.image : '',
          comboId: item.id,
          productId: undefined
        }];
      } else {
        newItems = [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
          image: item.image ? item.image : '',
          comboId: undefined,
          productId: item.id
      }];
      }
      return newItems;
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

  const handleSubmit = async (isPaid: boolean) => {
    try {
      console.log('DEBUG:', {
        provinceCode,
        provinceName,
        districtCode,
        districtName,
        wardCode,
        wardName,
        wardList,
        selectedWard: wardList.find(w => String(w.code) === String(wardCode))
      });
      if (!selectedUser || selectedItems.length === 0) {
        message.error('Vui lòng chọn khách hàng và thêm sản phẩm');
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
      if (!provinceCode || !provinceName || !districtCode || !districtName || !wardCode || !wardName) {
        message.error('Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã!');
        return;
      }

      // Transform items to match API requirements (gửi cả comboId và productId, 1 trong 2 là null)
      const orderItems = selectedItems.map(item => ({
        comboId: item.comboId || null,
        productId: item.productId || null,
          quantity: item.quantity,
          price: item.price
      }));
      console.log('orderItems gửi lên:', orderItems);

      const orderData = {
        userId: selectedUser,
        items: orderItems as any,
        total: calculateTotal(),
        address: addressDetail.trim(),
        phoneNumber: phoneNumber.trim(),
        note: note.trim() || undefined,
        paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        provinceCode: String(provinceCode),
        provinceName: provinceName,
        districtCode: String(districtCode),
        districtName: districtName,
        wardCode: String(wardCode),
        wardName: wardName
      };

      console.log('Creating order with data:', orderData);

      const orderService = new OrderService();
      const response = await orderService.create(orderData);
      
      if (response.status === 'success') {
        message.success('Tạo đơn hàng thành công');
        onSuccess();
        onClose();
        // Reset form
        setSelectedItems([]);
        setAddressDetail('');
        setPhoneNumber('');
        setNote('');
        setProvinceCode('');
        setDistrictCode('');
        setWardCode('');
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tạo đơn hàng');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      message.error('Có lỗi xảy ra khi tạo đơn hàng');
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
      title="Tạo đơn hàng mới"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
    >
      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-1/2">
          <div className="mb-4">
            <Select
              placeholder="Chọn khách hàng"
              className="w-full"
              onChange={value => setSelectedUser(value)}
              value={selectedUser || undefined}
              options={users.map(user => ({
                value: user.id,
                label: `${user.name} - ${user.phoneNumber || ''}`
              }))}
            />
          </div>

          <div className="mb-4">
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
                const selected = wardList.find(w => String(w.code) === String(value) || w.code === value);
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
            <Input
              placeholder="Địa chỉ chi tiết (số nhà, tên đường)"
              value={addressDetail}
              onChange={e => setAddressDetail(e.target.value)}
            />
            {loadingAddress && <Spin className="ml-2" />}
          </div>

          <div className="mb-4">
            <Input
              placeholder="Số điện thoại"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
            />
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
            <div className="space-x-4">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-100"
                onClick={onClose}
              >
                Quay lại
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => handleSubmit(false)}
              >
                Lưu
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => handleSubmit(true)}
              >
                Thanh toán
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal; 