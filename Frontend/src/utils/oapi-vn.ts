/**
 * Helper functions for open.oapi.vn API
 * API Documentation: https://oapi.vn/api-tinh-thanh-viet-nam
 */

export interface OApiProvince {
  id: string;
  name: string;
  type: number;
  typeText: string;
  slug: string;
}

export interface OApiDistrict {
  id: string;
  name: string;
  provinceId: string;
  type: number;
  typeText: string;
}

export interface OApiWard {
  id: string;
  name: string;
  districtid: string;
  type: number;
  typeText: string;
}

interface OApiResponse<T> {
  total: number;
  data: T[];
  code: string;
}

const OAPI_BASE_URL = 'https://open.oapi.vn/location';

/**
 * Get all provinces
 */
export async function getProvinces(): Promise<OApiProvince[]> {
  try {
    const response = await fetch(`${OAPI_BASE_URL}/provinces?page=0&size=1000`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const result: OApiResponse<OApiProvince> = await response.json();
    if (result.code === 'success' && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching provinces from open.oapi.vn:', error);
    return [];
  }
}

/**
 * Get districts by province ID
 */
export async function getDistrictsByProvinceId(provinceId: string): Promise<OApiDistrict[]> {
  try {
    const response = await fetch(`${OAPI_BASE_URL}/districts/${provinceId}?page=0&size=1000`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const result: OApiResponse<OApiDistrict> = await response.json();
    if (result.code === 'success' && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching districts for province ${provinceId} from open.oapi.vn:`, error);
    return [];
  }
}

/**
 * Get wards by district ID
 */
export async function getWardsByDistrictId(districtId: string): Promise<OApiWard[]> {
  try {
    const response = await fetch(`${OAPI_BASE_URL}/wards/${districtId}?page=0&size=1000`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const result: OApiResponse<OApiWard> = await response.json();
    if (result.code === 'success' && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching wards for district ${districtId} from open.oapi.vn:`, error);
    return [];
  }
}

/**
 * Get full address info from ward ID (ward -> district -> province)
 */
export async function getFullAddressFromWardId(wardId: string, districtId: string): Promise<{
  ward: OApiWard | null;
  district: OApiDistrict | null;
  province: OApiProvince | null;
} | null> {
  try {
    // Get wards for district
    const wards = await getWardsByDistrictId(districtId);
    const ward = wards.find(w => w.id === wardId);
    
    if (!ward) {
      return null;
    }

    // Get districts for province (need to find province first)
    // Since we have districtId, we can get district info
    // But we need provinceId to get province
    // For now, we'll need to search through all provinces (inefficient but works)
    const provinces = await getProvinces();
    for (const province of provinces) {
      const districts = await getDistrictsByProvinceId(province.id);
      const district = districts.find(d => d.id === districtId);
      if (district) {
        return {
          ward,
          district,
          province
        };
      }
    }
    
    return { ward, district: null, province: null };
  } catch (error) {
    console.error(`Error getting full address from wardId ${wardId}:`, error);
    return null;
  }
}

/**
 * Get province by ID
 */
export async function getProvinceById(provinceId: string): Promise<OApiProvince | null> {
  try {
    const provinces = await getProvinces();
    return provinces.find(p => p.id === provinceId) || null;
  } catch (error) {
    console.error(`Error fetching province ${provinceId} from open.oapi.vn:`, error);
    return null;
  }
}

