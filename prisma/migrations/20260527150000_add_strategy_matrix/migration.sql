-- CreateTable: strategy_matrix
-- Stores Matrix Seeding personas slide payload (s3) per business/user.
-- Seeded with demo data for the default strategy presentation (PHF 2026).

CREATE TABLE `strategy_matrix` (
  `strategy_matrix_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_matrix_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_matrix_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  PRIMARY KEY (`strategy_matrix_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record (PHF 2026 — Matrix Seeding personas)
-- payload is a top-level JSON array (4 persona objects)
INSERT INTO `strategy_matrix` (
  `strategy_matrix_id`,
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
  '[{"id":"p1","name":"Mẹ Bỉm Sữa","count":60,"ratio":"27","color":"from-pink-500 to-rose-600","hexColor":"#ec4899","icon":"users","focus":"Đăng hỏi đáp, xin review thực tế về an toàn cho trẻ nhỏ.","purpose":"Chịu trách nhiệm cào cấu cảm xúc, đánh vào tâm lý lo lắng.","stats":{"Tò mò & Học hỏi":85,"Đồng cảm":90,"Phản biện nhẹ":45,"Kích động mua":65,"Thao túng tâm lý":75}},{"id":"p2","name":"Reviewer Local","count":50,"ratio":"23","color":"from-emerald-500 to-teal-600","hexColor":"#10b981","icon":"activity","focus":"La cà hàng quán, check-in, khoe deal mua sắm khu vực.","purpose":"Đóng vai người mang tin chất lượng.","stats":{"Tò mò & Học hỏi":60,"Đồng cảm":50,"Phản biện nhẹ":85,"Kích động mua":95,"Thao túng tâm lý":80}},{"id":"p3","name":"Gia Đình Hiện Đại","count":40,"ratio":"18","color":"from-blue-500 to-indigo-600","hexColor":"#3b82f6","icon":"target","focus":"Khen tốc độ giao hàng, dịch vụ hậu mãi.","purpose":"Làm tăng uy tín về dịch vụ và vận hành ship hàng.","stats":{"Tò mò & Học hỏi":70,"Đồng cảm":80,"Phản biện nhẹ":30,"Kích động mua":50,"Thao túng tâm lý":40}},{"id":"p4","name":"Chuyên gia Dinh Dưỡng","count":70,"ratio":"32","color":"from-amber-500 to-orange-600","hexColor":"#f59e0b","icon":"brain","focus":"Phân tích thành phần, độ sạch chứng chỉ organic.","purpose":"Tạo trust tuyệt đối dựa trên góc nhìn khoa học.","stats":{"Tò mò & Học hỏi":95,"Đồng cảm":40,"Phản biện nhẹ":90,"Kích động mua":60,"Thao túng tâm lý":100}}]',
  TRUE,
  NOW(),
  NOW()
);
