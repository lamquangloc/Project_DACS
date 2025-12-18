/**
 * Helper functions for open.oapi.vn API
 * API Documentation: https://oapi.vn/api-tinh-thanh-viet-nam
 */

interface OApiProvince {
  id: string;
  name: string;
  type: number;
  typeText: string;
  slug: string;
}

interface OApiDistrict {
  id: string;
  name: string;
  provinceId: string;
  type: number;
  typeText: string;
}

interface OApiWard {
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
 * Get province by ID
 */
export async function getProvinceById(provinceId: string): Promise<OApiProvince | null> {
  try {
    const response = await fetch(`${OAPI_BASE_URL}/provinces?page=0&size=1000`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const result: OApiResponse<OApiProvince> = await response.json();
    if (result.code === 'success' && Array.isArray(result.data)) {
      return result.data.find(p => p.id === provinceId) || null;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching province ${provinceId} from open.oapi.vn:`, error);
    return null;
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
 * Get district by ID
 */
export async function getDistrictById(districtId: string, provinceId?: string): Promise<OApiDistrict | null> {
  try {
    // If provinceId is provided, search within that province
    if (provinceId) {
      const districts = await getDistrictsByProvinceId(provinceId);
      return districts.find(d => d.id === districtId) || null;
    }
    
    // Otherwise, search all provinces (slower but works)
    const provinces = await getProvinces();
    for (const province of provinces) {
      const districts = await getDistrictsByProvinceId(province.id);
      const district = districts.find(d => d.id === districtId);
      if (district) {
        return district;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching district ${districtId} from open.oapi.vn:`, error);
    return null;
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
 * Get ward by ID
 */
export async function getWardById(wardId: string, districtId?: string): Promise<OApiWard | null> {
  try {
    // If districtId is provided, search within that district
    if (districtId) {
      const wards = await getWardsByDistrictId(districtId);
      return wards.find(w => w.id === wardId) || null;
    }
    
    // Otherwise, we need to search all districts (very slow, not recommended)
    // For now, return null and require districtId
    console.warn('getWardById called without districtId - this is inefficient');
    return null;
  } catch (error) {
    console.error(`Error fetching ward ${wardId} from open.oapi.vn:`, error);
    return null;
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

    // Get district
    // Since we have districtId, we need to find which province it belongs to
    // Search through all provinces to find the district
    const provinces = await getProvinces();
    let foundDistrict: OApiDistrict | null = null;
    let foundProvince: OApiProvince | null = null;
    
    for (const province of provinces) {
      const districts = await getDistrictsByProvinceId(province.id);
      const district = districts.find(d => d.id === districtId);
      if (district) {
        foundDistrict = district;
        foundProvince = province;
        break;
      }
    }
    
    return {
      ward,
      district: foundDistrict,
      province: foundProvince
    };
  } catch (error) {
    console.error(`Error getting full address from wardId ${wardId}:`, error);
    return null;
  }
}

/**
 * Normalize name for matching (remove diacritics, lowercase, remove prefixes)
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/^phuong\s+|^xa\s+|^thi tran\s+|^quan\s+|^huyen\s+|^thanh pho\s+/g, '') // bỏ tiền tố
    .trim();
}

/**
 * Find ward by name in a district
 */
export async function findWardByName(wardName: string, districtId: string): Promise<OApiWard | null> {
  try {
    const wards = await getWardsByDistrictId(districtId);
    const normalizedTarget = normalizeName(wardName);
    
    const matched = wards.find(w => {
      const normalized = normalizeName(w.name);
      return normalized === normalizedTarget;
    });
    
    return matched || null;
  } catch (error) {
    console.error(`Error finding ward by name "${wardName}" in district ${districtId}:`, error);
    return null;
  }
}

