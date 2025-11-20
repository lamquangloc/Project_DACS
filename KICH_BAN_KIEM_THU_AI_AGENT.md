# Kịch Bản Kiểm Thử AI Agent - Nhà Hàng

## Tổng Quan

Tài liệu này mô tả 10 kịch bản kiểm thử chính để kiểm tra các tính năng của AI agent trong hệ thống nhà hàng, bao gồm: tìm kiếm món ăn, quản lý giỏ hàng, đặt hàng, hỏi về combo, và giao tiếp tự nhiên.

---

## Kịch Bản 1: Tìm Kiếm Món Ăn Theo Tên

**Mục đích kiểm thử:** Kiểm tra khả năng tìm kiếm và hiển thị món ăn theo tên hoặc loại.

**Người dùng:**
```
Tôi muốn ăn lẩu.
```

**AI Agent mong đợi:**
```
Giới thiệu các món liên quan tới lẩu
```

**Kiểm tra:**
- ✅ AI gọi tool "products Find" với filter name chứa "phở bò"
- ✅ Hiển thị danh sách món ăn với hình ảnh và giá
- ✅ Trả lời tự nhiên, không dùng quá nhiều markdown bold
- ✅ Có thể hỏi follow-up để gợi ý thêm

---

## Kịch Bản 2: Tìm Kiếm Món Ăn Theo Loại

**Mục đích kiểm thử:** Kiểm tra khả năng tìm kiếm món ăn theo danh mục/loại.

**Người dùng:**
```
Có món thịt gì ngon không?
```

**AI Agent mong đợi:**
```
Giới thiệu các món liên quan đến thịt
```

**Kiểm tra:**
- ✅ AI gọi tool "products Find" với filter category hoặc name chứa "bún"
- ✅ Hiển thị danh sách món bún với hình ảnh
- ✅ Trả lời tự nhiên, có thể hỏi thêm về khẩu vị

---

## Kịch Bản 3: Hỏi Về Combo

**Mục đích kiểm thử:** Kiểm tra khả năng tìm kiếm và hiển thị combo với hình ảnh.

**Người dùng:**
```
Có combo nào đang khuyến mãi không?
```

**AI Agent mong đợi:**
```
Dạ, hiện có combo cặp đôi (1-2 người) với giá 650.000₫, 
combo gia đình (3-4 người) với giá 1.200.000₫ đang được giảm 15%.
Bạn muốn mình thêm combo nào vào giỏ hàng không?
```

**Kiểm tra:**
- ✅ AI gọi tool "combos Find" để lấy danh sách combo
- ✅ Hiển thị combo với hình ảnh, tên, giá (giống như sản phẩm)
- ✅ Hiển thị đầy đủ thông tin combo (số người, giá, mô tả)
- ✅ Không hiển thị câu hỏi follow-up "Bạn có muốn thêm combo nào vào giỏ hàng không?" nếu đã có trong prompt

---

## Kịch Bản 4: Thêm Sản Phẩm Vào Giỏ Hàng

**Mục đích kiểm thử:** Kiểm tra khả năng thêm sản phẩm vào giỏ hàng và đồng bộ với frontend.

**Người dùng:**
```
Thêm phở bò tái vào giỏ hàng.
```

**AI Agent mong đợi:**
```
Đã thêm 1 Phở bò tái vào giỏ hàng. Giỏ hàng hiện có 1 món, tổng 89.000₫. 
Bạn muốn thêm món nữa hay đặt hàng?
```

**Kiểm tra:**
- ✅ AI gọi tool "products Find" để tìm sản phẩm
- ✅ AI gọi tool "carts Add" với `productId` (KHÔNG dùng `comboId`)
- ✅ Header Authorization có token đúng format
- ✅ Trả lời ngắn gọn, tự nhiên, không dùng quá nhiều markdown bold
- ✅ Trả về cart data trong response (field "cart") để frontend sync
- ✅ Format số tiền đúng (dấu chấm: 89.000₫)

---

## Kịch Bản 5: Thêm Combo Vào Giỏ Hàng

**Mục đích kiểm thử:** Kiểm tra khả năng thêm combo vào giỏ hàng với `comboId` đúng.

**Người dùng:**
```
Thêm combo cặp đôi vào giỏ hàng của tôi.
```

**AI Agent mong đợi:**
```
Đã thêm 1 Combo cặp đôi vào giỏ hàng. Giỏ hàng hiện có 1 món, tổng 650.000₫. 
Bạn muốn thêm món nữa hay đặt hàng?
```

**Kiểm tra:**
- ✅ AI gọi tool "combos Find" để tìm combo
- ✅ AI gọi tool "carts Add" với `comboId` (KHÔNG dùng `productId`)
- ✅ Header Authorization có token đúng format
- ✅ Không lỗi "Missing required field: productId or comboId is required"
- ✅ Không lỗi "invalid token" hoặc "No token provided"
- ✅ Trả lời ngắn gọn, tự nhiên
- ✅ Trả về cart data trong response để frontend sync
- ✅ Combo hiển thị đúng hình ảnh và tên trong giỏ hàng

---

## Kịch Bản 6: Xem Giỏ Hàng

**Mục đích kiểm thử:** Kiểm tra khả năng hiển thị giỏ hàng hiện tại.

**Người dùng:**
```
Giỏ hàng của mình giờ có gì rồi?
```

**AI Agent mong đợi:**
```
Dạ, bạn hiện có:
- 1 Phở bò tái: 89.000₫
- 1 Combo cặp đôi: 650.000₫
Tổng tạm tính là 739.000₫.
Bạn có muốn thanh toán luôn không?
```

**Kiểm tra:**
- ✅ AI gọi tool "carts Find" để lấy giỏ hàng
- ✅ Header Authorization có token đúng format
- ✅ Hiển thị đầy đủ items trong giỏ hàng
- ✅ Hiển thị tổng tiền đúng
- ✅ Trả về cart data trong response để frontend sync

---

## Kịch Bản 7: Xóa Món Khỏi Giỏ Hàng

**Mục đích kiểm thử:** Kiểm tra khả năng xóa món khỏi giỏ hàng.

**Người dùng:**
```
Xóa món gà nướng mật ong đi.
```

**AI Agent mong đợi:**
```
Dạ, mình đã xóa món gà nướng mật ong khỏi giỏ hàng.
Giỏ hàng hiện còn 2 món, tổng 650.000₫.
```

**Kiểm tra:**
- ✅ AI gọi tool "carts Remove" với `productId` hoặc `comboId` đúng
- ✅ Header Authorization có token đúng format
- ✅ Cập nhật giỏ hàng và tính lại tổng tiền
- ✅ Trả về cart data trong response để frontend sync

---

## Kịch Bản 8: Đặt Hàng

**Mục đích kiểm thử:** Kiểm tra khả năng tạo đơn hàng với thông tin đầy đủ.

**Người dùng:**
```
Mình muốn đặt hàng.
```

**AI Agent mong đợi:**
```
Dạ, để mình xác nhận lại đơn hàng của bạn:
- 1 Phở bò tái: 89.000₫
- 1 Combo cặp đôi: 650.000₫
Tổng cộng: 739.000₫.

Bạn vui lòng cung cấp:
- Số điện thoại: ...
- Địa chỉ giao hàng: ...
- Ghi chú (nếu có): ...
```

**Kiểm tra:**
- ✅ AI gọi tool "carts Find" để lấy giỏ hàng hiện tại
- ✅ AI hỏi thông tin đặt hàng (số điện thoại, địa chỉ, ghi chú)
- ✅ Sau khi có đủ thông tin, AI gọi tool "orders Create" để tạo đơn hàng
- ✅ Header Authorization có token đúng format
- ✅ Đơn hàng được tạo thành công với `productId` và `comboId` đúng
- ✅ Trả về thông tin đơn hàng (mã đơn, tổng tiền, thời gian dự kiến)

---

## Kịch Bản 9: Hỏi Về Mô Tả Món Ăn

**Mục đích kiểm thử:** Kiểm tra khả năng giải thích và mô tả món ăn.

**Người dùng:**
```
Phở đặc biệt có gì khác phở thường vậy?
```

**AI Agent mong đợi:**
```
Dạ, phở đặc biệt gồm thịt bò tái, chín, gân, nạm và viên bò, 
nước dùng đậm đà hơn phở thường.
Bạn muốn mình thêm món này vào giỏ hàng không?
```

**Kiểm tra:**
- ✅ AI gọi tool "products Find" để lấy thông tin chi tiết món ăn
- ✅ Hiển thị mô tả món ăn một cách tự nhiên
- ✅ Có thể hỏi follow-up để thêm vào giỏ hàng

---

## Kịch Bản 10: Giao Tiếp Tự Nhiên - Hỏi Ngoài Lề

**Mục đích kiểm thử:** Kiểm tra khả năng xử lý câu hỏi ngoài lề nhưng vẫn liên quan đến nhà hàng.

**Người dùng:**
```
Món nào được nhiều người gọi nhất?
```

**AI Agent mong đợi:**
```
Dạ, món được gọi nhiều nhất tuần này là cơm gà xối mỡ và lẩu thái hải sản.
Bạn có muốn mình đặt combo kèm nước đang giảm 10% cho hai món này không?
```

**Kiểm tra:**
- ✅ AI có thể trả lời câu hỏi về xu hướng (nếu có data)
- ✅ Hoặc trả lời lịch sự nếu không có data
- ✅ Vẫn giữ được ngữ cảnh nhà hàng và có thể gợi ý thêm

---

## Kịch Bản 11 (Bonus): Kiểm Tra Đơn Hàng Đã Đặt

**Mục đích kiểm thử:** Kiểm tra khả năng xem lịch sử đơn hàng.

**Người dùng:**
```
Cho mình xem đơn hàng vừa đặt.
```

**AI Agent mong đợi:**
```
Dạ, đơn hàng #ORD123456 của bạn:
- 1 Phở bò tái: 89.000₫
- 1 Combo cặp đôi: 650.000₫
Tổng cộng: 739.000₫
Trạng thái: Đang chuẩn bị
Dự kiến giao: 30-35 phút
```

**Kiểm tra:**
- ✅ AI gọi tool "orders Find" để lấy danh sách đơn hàng
- ✅ Hiển thị thông tin đơn hàng chi tiết
- ✅ Hiển thị đúng tên combo và hình ảnh combo (không phải placeholder)
- ✅ Header Authorization có token đúng format

---

## Checklist Tổng Quan

### Tính Năng Cơ Bản
- [ ] Tìm kiếm sản phẩm theo tên
- [ ] Tìm kiếm sản phẩm theo loại/danh mục
- [ ] Tìm kiếm combo
- [ ] Hiển thị hình ảnh sản phẩm/combo
- [ ] Hiển thị giá cả đúng format (dấu chấm: 89.000₫)

### Quản Lý Giỏ Hàng
- [ ] Thêm sản phẩm vào giỏ hàng (dùng `productId`)
- [ ] Thêm combo vào giỏ hàng (dùng `comboId`)
- [ ] Xem giỏ hàng
- [ ] Xóa món khỏi giỏ hàng
- [ ] Cập nhật số lượng
- [ ] Đồng bộ giỏ hàng với frontend (trả về cart data)

### Đặt Hàng
- [ ] Thu thập thông tin đặt hàng (số điện thoại, địa chỉ, ghi chú)
- [ ] Tạo đơn hàng thành công
- [ ] Hiển thị thông tin đơn hàng (mã đơn, tổng tiền, thời gian)
- [ ] Xem lịch sử đơn hàng
- [ ] Hiển thị đúng tên và hình ảnh combo trong đơn hàng

### Authentication & Security
- [ ] Header Authorization có token đúng format (`Bearer <token>`)
- [ ] Không lỗi "No token provided"
- [ ] Không lỗi "invalid token"
- [ ] Token được truyền đúng từ webhook đến tool

### Giao Tiếp & UX
- [ ] Trả lời tự nhiên, ngắn gọn
- [ ] Không dùng quá nhiều markdown bold
- [ ] Format số tiền đúng (dấu chấm)
- [ ] Câu hỏi follow-up tự nhiên
- [ ] Không hiển thị JSON raw trong message
- [ ] Không hiển thị câu hỏi follow-up không cần thiết

### Error Handling
- [ ] Xử lý lỗi khi không tìm thấy món
- [ ] Xử lý lỗi khi giỏ hàng trống
- [ ] Xử lý lỗi khi thiếu thông tin đặt hàng
- [ ] Thông báo lỗi rõ ràng, thân thiện

---

## Ghi Chú Kiểm Thử

1. **Test Environment:**
   - Đảm bảo backend đang chạy và kết nối với database
   - Đảm bảo N8N workflow đã được cấu hình đúng
   - Đảm bảo frontend có thể gửi request với token hợp lệ

2. **Test Data:**
   - Có ít nhất 5 sản phẩm trong database
   - Có ít nhất 2 combo trong database
   - Có user test với token hợp lệ

3. **Test Flow:**
   - Test từng kịch bản một cách độc lập
   - Test các kịch bản liên quan đến nhau (thêm món → xem giỏ → đặt hàng)
   - Test edge cases (giỏ hàng trống, món không tồn tại, token hết hạn)

4. **Expected Results:**
   - Mỗi kịch bản phải pass ít nhất 80% các mục kiểm tra
   - Không có lỗi authentication
   - Không có lỗi "Missing required field"
   - Response time < 5 giây cho mỗi request

---

## Kết Luận

Tài liệu này cung cấp 10 kịch bản kiểm thử chính để đảm bảo AI agent hoạt động đúng và đầy đủ các tính năng. Các kịch bản này bao phủ:
- Tìm kiếm và hiển thị món ăn/combo
- Quản lý giỏ hàng (thêm, xóa, xem)
- Đặt hàng và xem lịch sử
- Giao tiếp tự nhiên với người dùng
- Xử lý lỗi và edge cases

Việc kiểm thử đầy đủ các kịch bản này sẽ đảm bảo chất lượng và trải nghiệm người dùng tốt cho hệ thống AI agent.

