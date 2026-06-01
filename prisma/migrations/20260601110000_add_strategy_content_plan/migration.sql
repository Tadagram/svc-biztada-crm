-- CreateTable: strategy_content_plan
-- Stores Content Calendar slide payload — topic groups, posting schedule, content mix.

CREATE TABLE `strategy_content_plan` (
  `strategy_content_plan_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `guest_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_content_plan_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_content_plan_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  INDEX `strategy_content_plan_guest_id_idx`(`guest_id`),
  PRIMARY KEY (`strategy_content_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record
INSERT INTO `strategy_content_plan` (
  `strategy_content_plan_id`, `business_id`, `user_id`, `guest_id`, `payload`, `is_demo`, `created_at`, `updated_at`
) VALUES (
  UUID(),
  'demo',
  NULL,
  NULL,
  '{"totalPostsPerWeek":14,"platforms":["Facebook","Zalo OA","TikTok"],"topicGroups":[{"name":"Social Proof — Kết quả thực tế","ratio":"30%","frequency":"4 posts/tuần","platforms":["Facebook","TikTok"],"examples":["So sánh trái cây siêu thị vs Phú Hòa Fresh","Khách review sau 2 tuần dùng trái cây sạch"],"bestTimes":["20h-22h thứ 3,5","10h-11h cuối tuần"]},{"name":"Giáo dục — Kiến thức dinh dưỡng","ratio":"25%","frequency":"3-4 posts/tuần","platforms":["Facebook","Zalo OA"],"examples":["5 loại trái cây tốt cho da phụ nữ sau 30","Cách bảo quản trái cây tươi đúng cách"],"bestTimes":["7h-9h thứ 2,4,6"]},{"name":"Khuyến mãi & Flash Sale","ratio":"20%","frequency":"3 posts/tuần","platforms":["Facebook","Zalo OA"],"examples":["Flash sale 24h: Xoài Cát Hòa Lộc -30%","Combo gia đình cuối tuần tiết kiệm 150k"],"bestTimes":["11h thứ 2","8h thứ 6"]},{"name":"Review & Testimonial","ratio":"15%","frequency":"2 posts/tuần","platforms":["Facebook","TikTok"],"examples":["Video khách unbox đơn hàng 10kg","Phỏng vấn mẹ bỉm mua cho con"],"bestTimes":["19h-21h thứ 4, Chủ nhật"]},{"name":"Behind The Scenes","ratio":"10%","frequency":"1 post/tuần","platforms":["Facebook","TikTok"],"examples":["Quy trình kiểm tra chất lượng tại vườn","Đội ngũ đóng gói buổi sáng sớm"],"bestTimes":["Thứ 7, 10h-12h"]}],"contentMix":{"social_proof":"30%","educational":"25%","promotional":"20%","testimonial":"15%","behind_scenes":"10%"},"postingSchedule":{"Mon":["Tip dinh dưỡng (educate)","Ưu đãi đầu tuần (promo)"],"Tue":["Before/After (social proof)"],"Wed":["Kiến thức trái cây (educate)","Review khách hàng"],"Thu":["Behind the scenes"],"Fri":["Flash sale (promo)","Social proof trending"],"Sat":["Review video TikTok","Educate"],"Sun":["Social proof viral","Story tương tác"]},"contentFormats":["Ảnh carousel 5-7 tấm","Video Reels 15-30s","Video TikTok 30-60s","Story tương tác","Text + ảnh đơn"],"hashtagStrategy":["#PhúHòaFresh #TráiCâySạch #BìnhDương (brand)","#TráiCâyTươi #ThựcPhẩmSạch #DiệpDưỡng (topic)","#ReviewTráiCây #GiaoTậnNơi #ComboGiaTốt (social proof)"]}',
  TRUE,
  NOW(),
  NOW()
);
