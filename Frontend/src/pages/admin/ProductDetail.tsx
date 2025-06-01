import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateProductDto } from '../../types/product';
import { Category } from '../../types/category';
import { Unit } from '../../types/unit';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { unitService } from '../../services/unitService';
import { toast } from 'react-toastify';
import { Dialog } from '@headlessui/react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AddCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, description: string, image: File | null) => Promise<void>;
}

interface AddUnitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onAdd(name, description, image);
      setName('');
      setDescription('');
      setImage(null);
      setPreview('');
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg p-6 w-[500px]">
          <Dialog.Title className="text-lg font-medium mb-4">Thêm mới danh mục mặt hàng</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên danh mục (*)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh danh mục</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Mô tả thêm</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Trở lại
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
        </div>
      </div>
    </Dialog>
  );
};

const AddUnitDialog: React.FC<AddUnitDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(name);
    setName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg p-6 w-96">
          <Dialog.Title className="text-lg font-medium mb-4">Thêm mới đơn vị tính</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên đơn vị (*)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
                required
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Trở lại
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Lưu lại
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [preview, setPreview] = useState<string>('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [product, setProduct] = useState<CreateProductDto>({
    name: '',
    description: '',
    price: 0,
    costPrice: 0,
    categoryIds: [],
    unitId: '',
    image: undefined
  });
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Cập nhật style cho input text
  const inputClassName = "mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2";
  const textareaClassName = "mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2";
  const selectClassName = "mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const disabledInputClassName = "mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm px-3 py-2";

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, unitsRes] = await Promise.all([
        categoryService.getAll(1, 1000),
        unitService.getAll()
      ]);

      if (categoriesRes.status === 'success' && categoriesRes.data?.categories) {
        setCategories(categoriesRes.data.categories);
      } else {
        console.error('Failed to fetch categories:', categoriesRes);
        toast.error('Không thể tải danh sách danh mục');
      }

      if (unitsRes.status === 'success' && unitsRes.data?.units) {
        setUnits(unitsRes.data.units);
      } else {
        console.error('Failed to fetch units:', unitsRes);
        toast.error('Không thể tải danh sách đơn vị tính');
      }

      if (id && id !== 'new') {
        const productRes = await productService.getById(id);
        if (productRes.status === 'success' && productRes.data) {
          const { categories: productCategories = [], ...productData } = productRes.data;
          setProduct({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            costPrice: productData.costPrice,
            categoryIds: productCategories?.map(pc => pc.category.id) || [],
            unitId: productData.unitId,
            image: undefined
          });
          
          // Convert to Category type
          const categories: Category[] = productCategories.map(pc => ({
            id: pc.category.id,
            name: pc.category.name,
            orderNumber: 0,
            description: '',
            image: '',
            products: [],
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          
          setSelectedCategories(categories);
          
          if (productData.image) {
            const cleanPath = productData.image.replace(/^\/+/, '');
            setPreview(`${import.meta.env.VITE_API_URL}/${cleanPath}`);
          }
        } else {
          console.error('Failed to fetch product:', productRes);
          toast.error('Không thể tải thông tin sản phẩm');
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (name: string, description: string, image: File | null) => {
    try {
      const formData = new FormData();
      const orderNumber = await getNextOrderNumber();
      formData.append('orderNumber', orderNumber.toString());
      formData.append('name', name);
      formData.append('description', description);
      if (image) {
        formData.append('image', image);
      }

      const response = await categoryService.create(formData);
      
      if (response.status === 'success' && response.data) {
        toast.success('Thêm danh mục thành công');
        const newCategory = response.data;
        setCategories(prevCategories => [...prevCategories, newCategory]);
        
        setProduct(prevProduct => ({
          ...prevProduct,
          categoryIds: [...prevProduct.categoryIds, newCategory.id]
        }));
        setSelectedCategories(prevSelected => [...prevSelected, newCategory]);
        
        setIsCategoryDialogOpen(false);
      } else {
        toast.error(response.message || 'Thêm danh mục thất bại');
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi thêm danh mục';
      toast.error(errorMessage);
    }
  };

  const getNextOrderNumber = async () => {
    try {
      const response = await categoryService.getAll();
      if (response.status === 'success' && response.data?.categories) {
        const categories = response.data.categories;
        if (categories.length === 0) return 1;
        const maxOrderNumber = Math.max(...categories.map(c => c.orderNumber));
        return maxOrderNumber + 1;
      }
      return 1;
    } catch (error) {
      console.error('Error getting next order number:', error);
      return 1;
    }
  };

  const handleCategorySelect = (category: Category) => {
    const isSelected = product.categoryIds.includes(category.id);
    if (isSelected) {
      setProduct({
        ...product,
        categoryIds: product.categoryIds.filter(id => id !== category.id)
      });
      setSelectedCategories(selectedCategories.filter(c => c.id !== category.id));
    } else {
      setProduct({
        ...product,
        categoryIds: [...product.categoryIds, category.id]
      });
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleAddUnit = async (name: string) => {
    try {
      const response = await unitService.create({ name });
      if (response.status === 'success' && response.data) {
        toast.success('Thêm đơn vị thành công');
        setUnits([...units, response.data]);
        setProduct({ ...product, unitId: response.data.id });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi thêm đơn vị');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate required fields
    if (!product.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }

    if (!product.unitId) {
      toast.error('Vui lòng chọn đơn vị tính');
      return;
    }

    if (product.categoryIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một danh mục');
      return;
    }

    if (product.price < 0 || product.costPrice < 0) {
      toast.error('Giá không được âm');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      submitData.append('name', product.name);
      submitData.append('description', product.description || '');
      submitData.append('price', product.price.toString());
      submitData.append('costPrice', product.costPrice.toString());
      submitData.append('unitId', product.unitId);
      product.categoryIds.forEach(categoryId => {
        submitData.append('categoryIds[]', categoryId);
      });

      if (product.image) {
        submitData.append('image', product.image);
      }

      const response = id && id !== 'new'
        ? await productService.update(id, submitData)
        : await productService.create(submitData);

      if (response.status === 'success') {
        toast.success(id ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công');
        navigate('/admin/products');
      } else {
        toast.error(response.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      console.error('Error submitting product:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      // Cập nhật cả FormData và state product
      setProduct(prev => ({
        ...prev,
        image: file
      }));
      
      setPreview(URL.createObjectURL(file));
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
          {id === 'new' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-1">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh mặt hàng</label>
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

          <div className="col-span-1 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên mặt hàng (*)</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Danh mục (*)</label>
              <div className="mt-1 relative">
                <div className="min-h-[42px] flex flex-wrap gap-2 p-2 border-2 border-gray-300 rounded-md">
                  {selectedCategories.map((category) => (
                    <div key={category.id} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      <span>{category.name}</span>
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const category = categories.find(c => c.id === e.target.value);
                        if (category) handleCategorySelect(category);
                      }}
                      className={selectClassName}
                    >
                      <option value="">--Chọn danh mục--</option>
                      {categories
                        .filter(category => !product.categoryIds.includes(category.id))
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDialogOpen(true)}
                      className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <PlusIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Đơn vị tính (*)</label>
              <div className="flex items-center space-x-2">
                <select
                  value={product.unitId}
                  onChange={(e) => setProduct({ ...product, unitId: e.target.value })}
                  className={selectClassName}
                  required
                >
                  <option value="">--Chọn đơn vị--</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsUnitDialogOpen(true)}
                  className="mt-1 p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <PlusIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
              <textarea
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                rows={3}
                className={textareaClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giá mặt hàng</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Tên gọi (*)</label>
                  <input
                    type="text"
                    value="Giá thường"
                    className={disabledInputClassName}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Giá bán (*)</label>
                  <input
                    type="number"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
                    className={inputClassName}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Giá vốn (*)</label>
                  <input
                    type="number"
                    value={product.costPrice}
                    onChange={(e) => setProduct({ ...product, costPrice: Number(e.target.value) })}
                    className={inputClassName}
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
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

      <AddCategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onAdd={handleAddCategory}
      />

      <AddUnitDialog
        isOpen={isUnitDialogOpen}
        onClose={() => setIsUnitDialogOpen(false)}
        onAdd={handleAddUnit}
      />
    </div>
  );
};

export default ProductDetail; 