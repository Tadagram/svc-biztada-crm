-- CreateTable: strategy_seeding
-- Stores Seeding Operations slide payload — porter accounts, seeding accounts, demographics, comment matrix.

CREATE TABLE `strategy_seeding` (
  `strategy_seeding_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `guest_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_seeding_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_seeding_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  INDEX `strategy_seeding_guest_id_idx`(`guest_id`),
  PRIMARY KEY (`strategy_seeding_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record
INSERT INTO `strategy_seeding` (
  `strategy_seeding_id`, `business_id`, `user_id`, `guest_id`, `payload`, `is_demo`, `created_at`, `updated_at`
) VALUES (
  UUID(),
  'demo',
  NULL,
  NULL,
  '{"porterAccountsTotal":6,"seedingAccountsTotal":35,"demographicsTarget":["Nữ 25-40 tuổi, khu vực Bình Dương/HCM","Quan tâm sức khỏe, gia đình, thực phẩm sạch","Thu nhập 8-20tr/tháng"],"warmupWeeks":2,"phases":[{"platform":"Facebook","accountCount":20,"targetGroups":["Hội mẹ bỉm sữa Bình Dương","Ăn uống Thủ Dầu Một","Sống khỏe mỗi ngày"],"commentFrequency":"3-5 comment/ngày/account","commentTypes":["Hỏi giá combo","Review tích cực về chất lượng","Tag bạn bè cùng quan tâm"],"demographics":["Ảnh thật gia đình, 3+ tháng tuổi, 80+ bạn bè"]},{"platform":"Zalo","accountCount":15,"targetGroups":["Hội mẹ Bình Dương","Phụ huynh trường tiểu học khu vực"],"commentFrequency":"2-3 comment/ngày/account","commentTypes":["Hỏi giao hàng khu vực","Chia sẻ trải nghiệm dùng cho gia đình"],"demographics":["Số điện thoại thật, avatar ảnh gia đình"]}],"matrix":[{"type":"seed_question","ratio":"40%","tone":"curious","timing":"trong 15 phút đầu","example":"Trái cây ở đây có giao tận nơi khu vực Thủ Dầu Một không ạ?"},{"type":"reply_confirm","ratio":"30%","tone":"positive","timing":"sau 30-60 phút","example":"Mình order 3 lần rồi, tươi lắm chị ơi, giao nhanh nữa"},{"type":"tag_friend","ratio":"20%","tone":"recommend","timing":"sau 1-2 giờ","example":"@[tên bạn] ơi, mày đang tìm trái cây sạch thì vào đây đi"},{"type":"review_detail","ratio":"10%","tone":"authentic","timing":"sau 3-6 giờ","example":"Vừa nhận đơn 5kg xoài cát Hòa Lộc, múi dày, ngọt vừa. Đóng gói cẩn thận không bị dập. Sẽ order tiếp"}],"notes":"Không seeding đồng loạt — trải đều trong 4-6 giờ/bài. Mỗi account chỉ seeding 1 bài/ngày của cùng 1 fanpage."}',
  TRUE,
  NOW(),
  NOW()
);
