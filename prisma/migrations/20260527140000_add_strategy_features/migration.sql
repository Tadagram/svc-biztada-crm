-- CreateTable: strategy_features
-- Stores Features slide payload (s2) per business/user.
-- Seeded with demo data for the default strategy presentation (PHF 2026).

CREATE TABLE `strategy_features` (
  `strategy_features_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_features_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_features_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  PRIMARY KEY (`strategy_features_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record (PHF 2026 — Features/Scenarios slide)
INSERT INTO `strategy_features` (
  `strategy_features_id`,
  `business_id`,
  `user_id`,
  `payload`,
  `is_demo`,
  `created_at`,
  `updated_at`
)
VALUES (
  UUID(),
  'demo',
  NULL,
  '{"scenarios":[{"id":"sc-1","title":"Kịch bản 1: Thu thập tài nguyên -> Sản xuất remake -> Chăm sóc kênh","desc":"Luồng nội dung vận hành định kỳ giữa Marketing và BrandLabs cho các kênh mục tiêu.","steps":["Marketing thu thập tài nguyên từ kênh mục tiêu và lưu kho dữ liệu nội dung.","BrandLabs lấy tài liệu từ kho theo từng nhân vật cụ thể để tạo remake nội dung tự động.","Marketing nhận nội dung từ BrandLabs, post bài định kỳ để chăm sóc Profile FB, Group FB và TikTok."]},{"id":"sc-2","title":"Kịch bản 2: Seeding account bám content tạo FOMO","desc":"Luồng tăng tương tác tự nhiên bằng hành vi đa tính cách trên từng nội dung mục tiêu.","steps":["Marketing đẩy seeding accounts bám theo các content từ Kịch bản 1.","Mỗi account tương tác theo tính cách và hành vi riêng: comment, reply, like, share.","Hiệu ứng FOMO được tạo ra để bài post mục tiêu và kênh mục tiêu trở nên sinh động hơn."]},{"id":"sc-3","title":"Kịch bản 3: Phát hiện nhu cầu mua hàng -> Đẩy CRM","desc":"Luồng chuyển đổi từ tương tác cộng đồng sang dữ liệu khách hàng có nhu cầu.","steps":["Marketing theo dõi tương tác để phát hiện người dùng có tín hiệu nhu cầu mua hàng.","Tín hiệu nhu cầu được chuẩn hóa thành lead đủ điều kiện.","Thông tin lead được chuyển về CRM để lưu danh sách và phân loại theo campaign."]},{"id":"sc-4","title":"Kịch bản 4: Chatbot nhận lead CRM -> Tư vấn -> Chốt đơn","desc":"Luồng chốt đơn chủ động từ danh sách lead đã được CRM xác nhận.","steps":["Chatbot nhận danh sách leads từ CRM theo mức độ ưu tiên.","Chatbot chủ động tương tác tư vấn theo kịch bản sản phẩm và lịch sử hành vi.","Kết quả chốt đơn được cập nhật ngược về CRM để hoàn tất vòng đời đơn hàng."]}]}',
  TRUE,
  NOW(),
  NOW()
);
