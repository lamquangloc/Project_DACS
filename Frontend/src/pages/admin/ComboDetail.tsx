import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Dialog } from '@headlessui/react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import comboService from '../../services/comboService';
import { productService } from '../../services/productService';
import { CreateComboDto } from '../../types/combo';
import { Product } from '../../types/product';

import { getImageUrl } from '../../utils/image';


interface ProductWithQuantity {
  product: Product;
  quantity: number;
}

const ComboDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [comboProducts, setComboProducts] = useState<ProductWithQuantity[]>([]);
  const [preview, setPreview] = useState<string>('');
  const [combo, setCombo] = useState<CreateComboDto>({
    name: '',
    description: '',
    price: 0,
    products: []
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchComboData();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchComboData = async () => {
    try {
      const response = await comboService.getById(id!);
      if (response.status === 'success' && response.data) {
        const comboData = response.data;
        setCombo({
          name: comboData.name,
          description: comboData.description || '',
          price: comboData.price,
          products: (comboData.products || comboData.items || []).map((p: any) => ({
            productId: p.productId,
            quantity: p.quantity
          }))
        });
        
        setComboProducts((comboData.products || comboData.items || []).map((p: any) => ({
          product: p.product,
          quantity: p.quantity
        })));
        
        if (comboData.image) {
          setPreview(getImageUrl(comboData.image));
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi tải thông tin combo');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Log search term for debugging
      console.log("Fetching products with search term:", searchTerm);
      
      const response = await productService.search(searchTerm);
      
      if (response.status === 'success' && response.data) {
        console.log("Products data:", response.data);
        setProducts(response.data);
      } else {
        console.error("Failed to fetch products:", response.message);
        setProducts([]);
        toast.error("Không thể tải danh sách sản phẩm");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Không thể tải danh sách sản phẩm");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isProductDialogOpen) {
      fetchProducts();
    }
  }, [isProductDialogOpen]);
  
  // Add debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra type của file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Định dạng file không hợp lệ. Chỉ chấp nhận file JPG, JPEG, PNG, GIF, WEBP');
        e.target.value = ''; // Reset input
        return;
      }

      // Kiểm tra kích thước file (1MB = 1024 * 1024 bytes)
      if (file.size > 1024 * 1024) {
        toast.error('Kích thước file quá lớn. Tối đa 1MB');
        e.target.value = ''; // Reset input
        return;
      }

      setCombo({ ...combo, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setComboProducts(prevProducts =>
      prevProducts.map(cp =>
        cp.product.id === productId
          ? { ...cp, quantity: Math.max(1, newQuantity) }
          : cp
      )
    );
    
    setCombo(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.productId === productId
          ? { ...p, quantity: Math.max(1, newQuantity) }
          : p
      )
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setComboProducts(prevProducts =>
      prevProducts.filter(cp => cp.product.id !== productId)
    );
    
    setCombo(prev => ({
      ...prev,
      products: prev.products.filter(p => p.productId !== productId)
    }));
  };

  const handleAddSelectedProducts = () => {
    const productsToAdd = products
      .filter(p => selectedProducts.includes(p.id))
      .filter(p => !comboProducts.some(cp => cp.product.id === p.id));
    
    const newProductsWithQuantity = productsToAdd.map(p => ({
      product: p,
      quantity: 1
    }));
    
    setComboProducts(prev => [...prev, ...newProductsWithQuantity]);
    
    const newProductsForCombo = productsToAdd.map(p => ({
      productId: p.id,
      quantity: 1
    }));
    
    setCombo(prev => ({
      ...prev,
      products: [...prev.products, ...newProductsForCombo]
    }));
    
    setSelectedProducts([]);
    setIsProductDialogOpen(false);
  };

  const calculateTotalCost = () => {
    return comboProducts.reduce((total, cp) => total + (cp.product.price * cp.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!combo.name.trim()) {
      toast.error('Vui lòng nhập tên combo');
      return;
    }

    if (combo.price <= 0) {
      toast.error('Giá combo phải lớn hơn 0');
      return;
    }

    if (combo.products.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm vào combo');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('name', combo.name);
      formData.append('description', combo.description || '');
      formData.append('price', combo.price.toString());
      if (combo.image) {
        formData.append('image', combo.image);
      }
      // Chuyển đổi products thành items khi gửi lên server
      formData.append('items', JSON.stringify(combo.products));

      console.log('Creating combo with FormData');
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }

      const response = id && id !== 'new'
        ? await comboService.update(id, formData)
        : await comboService.create(formData);

      if (response.status === 'success') {
        toast.success(id ? 'Cập nhật combo thành công' : 'Thêm combo thành công');
        navigate('/admin/combos');
      } else {
        toast.error(response.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      console.error('Error submitting combo:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu combo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {id === 'new' ? 'Thêm combo mới' : 'Chỉnh sửa combo'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          {/* Left column - Image upload */}
          <div className="col-span-1">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh combo</label>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 object-contain" />
                ) : (
                  <div className="text-center">
                    <div className="mt-1 text-sm text-gray-600">
                      Dung lượng file tối đa 1 MB
                      <br />
                      Định dạng: JPG, JPEG, PNG, GIF, WEBP
                      <br />
                      Nên sử dụng hình ảnh có tỉ lệ 1:1
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                onChange={handleImageChange}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="mt-2"
              />
            </div>
          </div>

          {/* Right column - Combo details */}
          <div className="col-span-1 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên combo (*)</label>
              <input
                type="text"
                value={combo.name}
                onChange={(e) => setCombo({ ...combo, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Giá bán combo (*)</label>
              <input
                type="number"
                value={combo.price}
                onChange={(e) => setCombo({ ...combo, price: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Giá gốc</label>
              <input
                type="text"
                value={calculateTotalCost().toLocaleString('vi-VN') + ' đ'}
                className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm px-3 py-2"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
              <textarea
                value={combo.description}
                onChange={(e) => setCombo({ ...combo, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Products section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Danh sách sản phẩm</h2>
            <button
              type="button"
              onClick={() => setIsProductDialogOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <FaPlus className="w-4 h-4" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Ảnh sản phẩm</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comboProducts.map((cp) => (
                  <tr key={cp.product.id}>
                    <td className="py-3 px-4">
                      <img
                        src={getImageUrl(cp.product.image)}
                        alt={cp.product.name}
                        className="w-12 h-12 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.classList.contains('error-handled')) {
                            target.classList.add('error-handled');
                            target.src = '/placeholder-product.jpg';
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span>{cp.product.name}</span>
                    </td>
                    <td className="py-3 px-4">{cp.product.price.toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={cp.quantity}
                        onChange={(e) => handleQuantityChange(cp.product.id, parseInt(e.target.value))}
                        min="1"
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(cp.product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/combos')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md ${
              isSubmitting 
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
          </button>
        </div>
      </form>

      {/* Product selection dialog */}
      <Dialog
        open={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          <div className="relative bg-white rounded-lg p-6 w-[800px]">
            <Dialog.Title className="text-lg font-medium mb-4">Thêm sản phẩm vào combo</Dialog.Title>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(products.map(p => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Ảnh sản phẩm</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => {
                            setSelectedProducts(prev => {
                              if (prev.includes(product.id)) {
                                return prev.filter(id => id !== product.id);
                              } else {
                                return [...prev, product.id];
                              }
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.classList.contains('error-handled')) {
                              target.classList.add('error-handled');
                              target.src = '/placeholder-product.jpg';
                            }
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span>{product.name}</span>
                      </td>
                      <td className="py-3 px-4">{product.price.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsProductDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddSelectedProducts}
                disabled={selectedProducts.length === 0}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md ${
                  selectedProducts.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-700'
                }`}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ComboDetail; 