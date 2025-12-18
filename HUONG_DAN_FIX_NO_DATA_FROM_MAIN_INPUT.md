# HƯỚNG DẪN FIX LỖI "No data found from `main` input" TRONG NODE `create_order`

## 🔴 VẤN ĐỀ

Khi AI Agent gọi tool `create_order`, node này báo lỗi:
```
No data found from `main` input
```

**Nguyên nhân:**
- Khi AI Agent gọi tool (HTTP Request node), node đó **KHÔNG nhận được data từ main input** (`$json`)
- Các expressions đang cố lấy data từ `$json` nhưng không có data ở đó
- Cần lấy data từ các node khác trong workflow: `Set Current Cart`, `Simple Memory`, `Webhook`

## ✅ GIẢI PHÁP

### BƯỚC 1: Kiểm tra workflow structure

Đảm bảo workflow có cấu trúc:
```
Webhook → Set Current Cart → AI Agent → create_order (tool)
                                    ↓
                            Simple Memory
```

### BƯỚC 2: Sửa expressions trong node `create_order`

Vào node `create_order` → Tab **Parameters** → **Body Parameters**, sửa các expressions như sau:

#### 2.1. `userId`
**Expression mới:**
```javascript
={{ $('Set Current Cart').first()?.json?.userId || $('Webhook').first()?.json?.body?.userId || $('Webhook').first()?.json?.userId || '' }}
```

**Giải thích:** Lấy từ `Set Current Cart` hoặc `Webhook` (nguồn gốc), không lấy từ `$json` (main input).

---

#### 2.2. `items`
**Expression mới:**
```javascript
={{ 
  $('Set Current Cart').first()?.json?.cart?.items || 
  $('Set Current Cart').first()?.json?.items || 
  $('Set Current Cart').first()?.json?.currentCart?.items || 
  $('Webhook').first()?.json?.body?.cart?.items || 
  $('Webhook').first()?.json?.body?.context?.cart?.items || 
  $('Webhook').first()?.json?.cart?.items || 
  [] 
}}
```

**Giải thích:** Ưu tiên lấy từ `Set Current Cart` (node đã normalize cart data), sau đó mới lấy từ `Webhook`.

---

#### 2.3. `totalAmount`
**Expression mới:**
```javascript
={{ 
  Number(
    $('Set Current Cart').first()?.json?.cartTotal || 
    $('Set Current Cart').first()?.json?.total || 
    $('Set Current Cart').first()?.json?.cart?.total || 
    $('Set Current Cart').first()?.json?.currentCart?.total || 
    $('Webhook').first()?.json?.body?.cart?.total || 
    $('Webhook').first()?.json?.body?.context?.cart?.total || 
    0
  ) 
}}
```

**Giải thích:** Lấy từ `Set Current Cart` (đã tính sẵn `cartTotal`), fallback về `Webhook`.

---

#### 2.4. `sessionId`
**Expression mới:**
```javascript
={{ 
  $('Set Current Cart').first()?.json?.sessionId || 
  $('Webhook').first()?.json?.body?.sessionId || 
  $('Webhook').first()?.json?.sessionId || 
  '' 
}}
```

---

#### 2.5. `source`
**Expression mới:**
```javascript
={{ 
  $('Set Current Cart').first()?.json?.source || 
  $('Webhook').first()?.json?.body?.source || 
  'n8n-chatbot' 
}}
```

---

#### 2.6. `paymentStatus`
**Expression mới:**
```javascript
={{ 
  $('Set Current Cart').first()?.json?.paymentStatus || 
  $('Webhook').first()?.json?.body?.paymentStatus || 
  'PENDING' 
}}
```

---

#### 2.7. `status`
**Expression mới:**
```javascript
={{ 
  $('Set Current Cart').first()?.json?.status || 
  $('Webhook').first()?.json?.body?.status || 
  'PENDING' 
}}
```

---

#### 2.8. `phoneNumber`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.phoneNumber || 
  $('Set Current Cart').first()?.json?.phoneNumber || 
  $('Webhook').first()?.json?.body?.phoneNumber || 
  '' 
}}
```

**Giải thích:** Ưu tiên lấy từ `Simple Memory` (AI đã lưu khi user nhập), sau đó mới lấy từ các nguồn khác.

---

#### 2.9. `address`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.address || 
  $('Set Current Cart').first()?.json?.address || 
  $('Webhook').first()?.json?.body?.address || 
  $('Webhook').first()?.json?.body?.addressText || 
  $('Webhook').first()?.json?.body?.rawAddress || 
  $('Webhook').first()?.json?.body?.fullAddress || 
  '' 
}}
```

**Giải thích:** Ưu tiên lấy từ `Simple Memory` (AI đã lưu khi user nhập).

---

#### 2.10. `provinceCode`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.provinceCode || 
  $('Set Current Cart').first()?.json?.provinceCode || 
  $('Webhook').first()?.json?.body?.provinceCode || 
  '' 
}}
```

---

#### 2.11. `provinceName`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.provinceName || 
  $('Set Current Cart').first()?.json?.provinceName || 
  $('Webhook').first()?.json?.body?.provinceName || 
  '' 
}}
```

---

#### 2.12. `districtCode`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.districtCode || 
  $('Set Current Cart').first()?.json?.districtCode || 
  $('Webhook').first()?.json?.body?.districtCode || 
  '' 
}}
```

---

#### 2.13. `districtName`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.districtName || 
  $('Set Current Cart').first()?.json?.districtName || 
  $('Webhook').first()?.json?.body?.districtName || 
  '' 
}}
```

---

#### 2.14. `wardCode`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.wardCode || 
  $('Set Current Cart').first()?.json?.wardCode || 
  $('Webhook').first()?.json?.body?.wardCode || 
  '' 
}}
```

---

#### 2.15. `wardName`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.wardName || 
  $('Set Current Cart').first()?.json?.wardName || 
  $('Webhook').first()?.json?.body?.wardName || 
  '' 
}}
```

---

#### 2.16. `note`
**Expression mới:**
```javascript
={{ 
  $('Simple Memory').first()?.json?.note || 
  $('Set Current Cart').first()?.json?.note || 
  $('Webhook').first()?.json?.body?.note || 
  '' 
}}
```

---

## 📋 TÓM TẮT THAY ĐỔI

### Trước (SAI - gây lỗi):
- Tất cả expressions đều bắt đầu với `$json` (main input)
- Khi AI Agent gọi tool, không có data ở main input → Lỗi

### Sau (ĐÚNG):
- **Cart data** (`items`, `totalAmount`) → Lấy từ `Set Current Cart` (ưu tiên) hoặc `Webhook`
- **User info** (`userId`, `sessionId`) → Lấy từ `Set Current Cart` hoặc `Webhook`
- **Order details** (`phoneNumber`, `address`, `provinceCode`, etc.) → Lấy từ `Simple Memory` (ưu tiên) hoặc `Set Current Cart` hoặc `Webhook`
- **Metadata** (`source`, `paymentStatus`, `status`) → Lấy từ `Set Current Cart` hoặc `Webhook`, có fallback mặc định

---

## 🔍 KIỂM TRA SAU KHI SỬA

1. **Test flow đặt hàng:**
   - Thêm món vào giỏ
   - Nhập thông tin địa chỉ (SĐT, tỉnh, quận, phường, địa chỉ, ghi chú)
   - Xác nhận đặt hàng

2. **Kiểm tra node `create_order`:**
   - Vào node `create_order` → Tab **OUTPUT**
   - Xem các field có giá trị đúng không:
     - `userId`: Có giá trị (không rỗng)
     - `items`: Array có items (không rỗng)
     - `totalAmount`: Số > 0
     - `phoneNumber`: Có giá trị (không rỗng)
     - `address`: Có giá trị (không rỗng)
     - `provinceCode`, `districtCode`, `wardCode`: Có giá trị (không rỗng)

3. **Kiểm tra backend:**
   - Đơn hàng được tạo thành công
   - Địa chỉ và SĐT được lưu đúng

---

## ⚠️ LƯU Ý

1. **Tên node phải đúng:**
   - `Set Current Cart` (chính xác tên node trong workflow)
   - `Simple Memory` (chính xác tên node trong workflow)
   - `Webhook` (chính xác tên node trong workflow)

2. **Nếu tên node khác:**
   - Thay `$('Set Current Cart')` bằng tên node thực tế (ví dụ: `$('Set Current Cart 2')`)
   - Thay `$('Simple Memory')` bằng tên node thực tế (ví dụ: `$('Simple Memory 1')`)
   - Thay `$('Webhook')` bằng tên node thực tế (ví dụ: `$('Webhook 1')`)

3. **Nếu vẫn lỗi:**
   - Kiểm tra node `Set Current Cart` có output data không
   - Kiểm tra node `Simple Memory` có lưu data không
   - Kiểm tra workflow có kết nối đúng không

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi sửa:
- ✅ Node `create_order` không còn lỗi "No data found from `main` input"
- ✅ Tất cả fields có giá trị đúng
- ✅ Đơn hàng được tạo thành công với đầy đủ thông tin

