import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../../types/category';
import { API_URL } from '../../config';
import { FaSort, FaSortUp, FaSortDown, FaEye,  FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface CategoryTableProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectCategory: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (ids: string[]) => void;
}

type SortField = 'orderNumber' | 'products';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  selectedCategories,
  onSelectCategory,
  onSelectAll,
}) => {
  const navigate = useNavigate();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page when categories change
  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      return '/placeholder-image.jpg';
    }
    // Nếu imagePath đã bắt đầu bằng http hoặc https, sử dụng nguyên đường dẫn
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Nếu imagePath bắt đầu bằng /, bỏ dấu / đầu tiên để tránh double slash
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${API_URL}/${cleanPath}`;
  };

  const handleImageError = (imagePath: string) => {
    if (!failedImages.has(imagePath)) {
      console.error('Image load error:', imagePath);
      setFailedImages(prev => new Set(prev).add(imagePath));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <FaSort className="w-3 h-3 ml-1" />;
    return sortOrder === 'asc' ? (
      <FaSortUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <FaSortDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  // Sort categories
  const sortedCategories = [...categories].sort((a, b) => {
    if (sortField === 'orderNumber') {
      return sortOrder === 'asc' 
        ? (a.orderNumber || 0) - (b.orderNumber || 0)
        : (b.orderNumber || 0) - (a.orderNumber || 0);
    } else {
      const aCount = a._count?.products || 0;
      const bCount = b._count?.products || 0;
      return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
    }
  });

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedCategories.length);
  const currentCategories = sortedCategories.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={categories.length > 0 && selectedCategories.length === categories.length}
                onChange={onSelectAll}
              />
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('orderNumber')}
            >
              <div className="flex items-center">
                STT
                {getSortIcon('orderNumber')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hình ảnh
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tên danh mục
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mô tả
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('products')}
            >
              <div className="flex items-center">
                Số lượng sản phẩm
                {getSortIcon('products')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentCategories.map((category) => (
            <tr key={category.id} className={category.isDeleted ? 'bg-gray-100' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => onSelectCategory(category.id)}
                  disabled={category.isDeleted}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {category.orderNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-16 w-16 flex-shrink-0">
                  {!failedImages.has(category.image) ? (
                    <img 
                      className="h-16 w-16 rounded-lg object-cover" 
                      src={getImageUrl(category.image)}
                      alt={category.name}
                      onError={() => handleImageError(category.image)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Không có ảnh</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{category.name}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500 max-w-xs truncate">{category.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {category._count?.products || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => navigate(`${category.id}`)}
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

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang trước
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                <span className="font-medium">{endIndex}</span> trong{' '}
                <span className="font-medium">{sortedCategories.length}</span> danh mục
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trang trước</span>
                  <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {getPageNumbers().map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNumber
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trang sau</span>
                  <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTable;