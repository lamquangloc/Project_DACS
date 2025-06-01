import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import CategoryTable from '../../components/admin/CategoryTable';
import { categoryService } from '../../services/categoryService';
import { Category } from '../../types/category';
import { toast } from 'react-toastify';

const ITEMS_PER_PAGE = 10;

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  const fetchCategories = async (page: number, search: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryService.getAll(page, ITEMS_PER_PAGE, search);
      if (response.status === 'success' && response.data) {
        const sortedCategories = [...response.data.categories].sort((a, b) => 
          (a.orderNumber || 0) - (b.orderNumber || 0)
        );
        setCategories(sortedCategories);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.message || 'Có lỗi xảy ra khi tải danh sách danh mục');
        toast.error(response.message || 'Có lỗi xảy ra khi tải danh sách danh mục');
      }
    } catch (error) {
      const errorMessage = 'Có lỗi xảy ra khi tải danh sách danh mục';
      console.error('Error fetching categories:', error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCategories(currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(category => category.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa các danh mục đã chọn?')) {
      try {
        await categoryService.deleteMany(selectedCategories);
        toast.success('Xóa danh mục thành công');
        await fetchCategories(currentPage, searchTerm);
        setSelectedCategories([]);
      } catch (error) {
        console.error('Error deleting categories:', error);
        toast.error('Có lỗi xảy ra khi xóa danh mục');
      }
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      await categoryService.deleteMany(ids);
      toast.success('Xóa danh mục thành công');
      fetchCategories(currentPage, searchTerm);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa danh mục');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const renderPagination = () => {
    if (!totalPages || totalPages <= 0) return null;

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

    // Ensure safe number conversions
    const startItem = categories.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems || 0);
    const totalItemsDisplay = totalItems || 0;

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang trước
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang sau
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{String(startItem)}</span> đến{' '}
              <span className="font-medium">{String(endItem)}</span> trong{' '}
              <span className="font-medium">{String(totalItemsDisplay)}</span> danh mục
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Trang trước</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === number
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {String(number)}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Trang sau</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý Danh mục</h1>
        <p className="mt-2 text-sm text-gray-700">
          Quản lý tất cả các danh mục sản phẩm trong hệ thống
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <button
          onClick={() => navigate('/admin/categories/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm danh mục
        </button>
      </div>

      <CategoryTable
        categories={categories}
        selectedCategories={selectedCategories}
        onSelectCategory={handleSelectCategory}
        onSelectAll={handleSelectAll}
        onDelete={handleDelete}
      />

      {totalPages > 0 && renderPagination()}

      {selectedCategories.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Xóa {selectedCategories.length} mục đã chọn
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement; 