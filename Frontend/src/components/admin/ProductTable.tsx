import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/format';
import { FaEye, FaTrash } from 'react-icons/fa';
import { Category } from '../../types/category';

interface ProductTableProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (ids: string[]) => void;
  allCategories: Category[];
}

const ProductTable: React.FC<ProductTableProps> = ({ 
  products, 
  selectedProducts, 
  onSelectProduct, 
  onSelectAll, 
  onDelete, 
  allCategories 
}) => {
  const navigate = useNavigate();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return '/placeholder-product.jpg';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.replace(/^\/+/, '');
    return `${import.meta.env.VITE_API_URL}/${cleanPath}`;
  };

  const handleImageError = (imagePath: string | undefined | null) => {
    if (imagePath && !failedImages.has(imagePath)) {
      console.error('Image load error:', imagePath);
      setFailedImages(prev => new Set(prev).add(imagePath));
    }
  };

  return (
    <div>
      {selectedProducts.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => onDelete(selectedProducts)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FaTrash className="mr-2" />
            Xóa {selectedProducts.length} sản phẩm đã chọn
          </button>
        </div>
      )}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={onSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hình ảnh
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên sản phẩm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Giá
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Danh mục
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đơn vị
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct(product.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-16 w-16 flex-shrink-0">
                    {product.image && !failedImages.has(product.image) ? (
                      <img 
                        className="h-16 w-16 object-cover rounded" 
                        src={getImageUrl(product.image)}
                        alt={product.name || '-'}
                        onError={() => handleImageError(product.image)}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Không có ảnh</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(product.price)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {product.categories && product.categories.length > 0 ? (
                      product.categories.map((pc, idx) => {
                        if (pc.category && pc.category.name) {
                          return (
                            <span
                              key={pc.category.id || idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {pc.category.name}
                            </span>
                          );
                        }
                        const catId = (pc as any).categoryId || (pc.category && pc.category.id);
                        const catName = allCategories.find(c => c.id === catId)?.name || catId || '-';
                        return (
                          <span
                            key={catId || idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {catName}
                          </span>
                        );
                      })
                    ) : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.unit?.name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => navigate(`${product.id}`)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Xem chi tiết"
                  >
                    <FaEye className="mr-1.5 h-4 w-4" />
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable; 