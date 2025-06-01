import { API_URL } from '../config';

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '/placeholder-image.jpg';
  
  // If the path is already a full URL (including Google URLs), return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.log('Using external URL:', path);
    return path;
  }

  // Remove any leading slashes
  const cleanPath = path.replace(/^\/+/, '');

  // For local images, prepend the API URL
  const fullUrl = `${API_URL}/${cleanPath}`;
  console.log('Using local URL:', fullUrl);
  return fullUrl;
}; 