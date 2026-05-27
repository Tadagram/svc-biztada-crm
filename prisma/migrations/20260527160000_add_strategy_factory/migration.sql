-- CreateTable: strategy_factory
-- Stores Factory/Content Production slide payload (s4) per business/user.
-- Seeded with demo data for the default strategy presentation (PHF 2026).

CREATE TABLE `strategy_factory` (
  `strategy_factory_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_factory_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_factory_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  PRIMARY KEY (`strategy_factory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record (PHF 2026 — BrandLabs Factory / Content Production)
-- payload is a top-level JSON array (3 area objects)
INSERT INTO `strategy_factory` (
  `strategy_factory_id`,
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
  '[{"title":"Group Cộng Đồng Chủ Lực","count":"3 Groups","volume":"42","unit":"Bài/tuần","desc":"Nuôi cộng đồng theo trục sức khỏe - phụ nữ - gia đình để kéo thảo luận tự nhiên quanh trái cây cao cấp.","postingFrequency":"2 bài mới/ngày/group + 1 bài ghim chuyên đề/tuần","avgEngagement":"140-220 tương tác/bài (comment + reaction)","tag":"Community SEO","details":[{"name":"Group 1 - Sống Khỏe Mỗi Ngày","topics":"Nội dung lợi ích dinh dưỡng của trái cây cao cấp, thực đơn thanh lọc, kết hợp trái cây theo thể trạng.","postingFrequency":"2 bài/ngày","avgEngagement":"160-230 tương tác/bài"},{"name":"Group 2 - Phụ Nữ Đẹp Từ Bên Trong","topics":"Beauty routine bằng trái cây, giữ dáng sau sinh, detox nhẹ cho nữ văn phòng, mẹo chọn trái cây sạch.","postingFrequency":"2 bài/ngày","avgEngagement":"130-210 tương tác/bài"},{"name":"Group 3 - Bếp Nhà Có Trái Cây","topics":"Thực đơn gia đình có trẻ nhỏ/người lớn tuổi, bữa phụ lành mạnh, combo trái cây tiện lợi theo tuần.","postingFrequency":"2 bài/ngày","avgEngagement":"120-190 tương tác/bài"}]},{"title":"Fanpage Săn Sales Trái Cây Cao Cấp","count":"1 Fanpage chính + 6 vệ tinh hỗ trợ","volume":"56","unit":"Bài/tuần","desc":"Đánh mạnh nhu cầu mua nhanh bằng nội dung deal giờ vàng, hộp quà cao cấp và review khách thật.","postingFrequency":"6-8 bài/ngày (khung 7h, 11h30, 16h, 20h)","avgEngagement":"180-320 tương tác/bài deal tốt","tag":"Sales Booster","details":[{"name":"Nhóm nội dung 1 - Deal Nhanh Trong Ngày","topics":"Flash sale theo khung giờ, combo tiết kiệm theo ngân sách, mã freeship khu vực nội thành.","postingFrequency":"3 bài/ngày","avgEngagement":"220-340 tương tác/bài"},{"name":"Nhóm nội dung 2 - Quà Tặng & Biếu Tặng","topics":"Set quà cho đối tác/gia đình, hộp trái cây premium theo dịp, nội dung unbox sang trọng.","postingFrequency":"2 bài/ngày","avgEngagement":"150-260 tương tác/bài"},{"name":"Nhóm nội dung 3 - Review Chất Lượng Thực Tế","topics":"Feedback khách thật, video cắt thử tại kho, so sánh độ tươi và truy xuất nguồn gốc.","postingFrequency":"1-2 bài/ngày","avgEngagement":"160-280 tương tác/bài"}]},{"title":"Kênh TikTok Vệ Tinh Chuyển Đổi","count":"3 Kênh","volume":"27","unit":"Video/tuần","desc":"Tập trung video ngắn giàu cảm xúc và bằng chứng chất lượng để kéo lead về fanpage và chatbot.","postingFrequency":"Mỗi kênh 1-2 video/ngày","avgEngagement":"2.5k-8k views/video, 120-350 tương tác/video","tag":"Short Video","details":[{"name":"TikTok 1 - Trái Cây & Sức Khỏe","topics":"Tip ăn trái cây đúng thời điểm, công thức nước ép/overnight, lợi ích theo từng nhóm tuổi.","postingFrequency":"2 video/ngày","avgEngagement":"150-300 tương tác/video"},{"name":"TikTok 2 - Phụ Nữ Bận Rộn","topics":"Routine giữ dáng với trái cây, hộp snack lành mạnh cho dân văn phòng, thực đơn 7 ngày.","postingFrequency":"1-2 video/ngày","avgEngagement":"130-260 tương tác/video"},{"name":"TikTok 3 - Bữa Nhà & Gia Đình","topics":"Gợi ý bữa phụ cho trẻ, khay trái cây cuối tuần cho gia đình, hậu trường đóng gói sạch.","postingFrequency":"1-2 video/ngày","avgEngagement":"120-240 tương tác/video"}]}]',
  TRUE,
  NOW(),
  NOW()
);
