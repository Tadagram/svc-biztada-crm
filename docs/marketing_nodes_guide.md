# Hướng Dẫn Cấu Hình Marketing Nodes (Dành Cho Agent)

Tài liệu này giải thích ý nghĩa các tham số phức tạp trong các Marketing Nodes. Bạn PHẢI đọc kỹ và hiểu ngữ cảnh trước khi thiết lập Workflow.

## 1. Cấu hình bài viết (Các node: post_to_profile, post_to_group, post_to_fanpage)

### `add_to_seeding_contents` (boolean)
- **Ý nghĩa:** Quyết định xem bài viết này sau khi đăng xong có được đưa vào "Danh sách chờ Seeding" hay không.
- **Khi nào chọn `true`:** Khi mục tiêu của chiến dịch là tạo ra bài đăng mồi (seeding post) để sau đó lấy các nick clone/nick phụ vào bình luận, thả like tạo hiệu ứng đám đông. BẮT BUỘC BẬT nếu yêu cầu nhắc đến "seeding mồi", "tạo hiệu ứng đám đông".
- **Khi nào chọn `false`:** Khi mục tiêu chỉ là đăng bài thông báo, chia sẻ kiến thức đơn thuần mà không cần kéo tương tác ảo.

### `image_source_type` (enum)
- **`none`:** Bài đăng chỉ có chữ (Text-only).
- **`context`:** Lấy ảnh từ "ngữ cảnh" của luồng chạy. (Dùng khi node trước đó là `ai_generate_asset` hoặc `ai_grok_remake_image` đã tạo ra ảnh và lưu vào ngữ cảnh).
- **`vault_asset`:** Lấy ảnh từ kho BrandLabs của khách hàng. Phải cung cấp kèm `image_asset_id`.

## 2. Cấu hình tương tác (Các node: fanpage_comment_on_post, fanpage_reply_to_comments)

### `comment_mode` (enum)
- **`discussion`:** Bình luận tự nhiên, tạo cuộc trò chuyện, kết bạn. Không mang tính bán hàng. Dùng để nuôi nick hoặc làm thân với group.
- **`seeding`:** Bình luận có tính định hướng, mồi chài mua hàng, chim mồi chốt sale.

### `dispatch_mode` (enum)
- **Ý nghĩa:** Nguồn lấy bài viết để Agent nhảy vào bình luận.
- **`specific`:** Bình luận vào một bài viết cụ thể (Yêu cầu có `selected_post_url`).
- **`managed`:** Bình luận vào các bài viết do tài khoản tự quản lý.
- **`group_posts`:** Bình luận vào các bài viết lấy từ node `find_group_posts`. (BẮT BUỘC PHẢI CHỈ ĐỊNH `find_group_posts_node_id` liên kết).
- **`filter_posts`:** Bình luận vào bài viết từ node `filter_post`.

## 3. Cấu hình thu thập/quét (Node: find_trend_fb)

### `discovery_mode` (enum)
- **`personal`:** Quét bảng tin (Feed) cá nhân bằng hashtag.
- **`group`:** Quét bên trong một Hội nhóm cụ thể.
- **`fanpage`:** Quét trên một Trang (Fanpage) cụ thể.

## TÓM LẠI QUY TẮC CỐT LÕI DÀNH CHO AGENT
Nếu user yêu cầu **"Lên kịch bản đăng bài vào nhóm và seeding"**:
1. Thêm Node `post_to_group`. BẮT BUỘC set `add_to_seeding_contents = true`.
2. Gắn kết với Node `share_url` hoặc `fanpage_comment_on_post` bằng cách chọn `dispatch_mode = managed` hoặc trỏ đến Node đăng bài.
Tuyệt đối không bỏ trống các cờ (flags) quan trọng này.
