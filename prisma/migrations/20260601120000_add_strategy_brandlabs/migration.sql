-- CreateTable: strategy_brandlabs
-- Stores Brandlabs Operations slide payload — source channels, remake workflow, auto-schedule, seeding config, marketing workflows.

CREATE TABLE `strategy_brandlabs` (
  `strategy_brandlabs_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `guest_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_brandlabs_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_brandlabs_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  INDEX `strategy_brandlabs_guest_id_idx`(`guest_id`),
  PRIMARY KEY (`strategy_brandlabs_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record
INSERT INTO `strategy_brandlabs` (
  `strategy_brandlabs_id`, `business_id`, `user_id`, `guest_id`, `payload`, `is_demo`, `created_at`, `updated_at`
) VALUES (
  UUID(),
  'demo',
  NULL,
  NULL,
  '{"sourceChannels":[{"platform":"TikTok","contentType":"food_review","keywords":["#tráicây","#thựcphẩmsạch","#ănclean","#detox","#giađình"],"filterCriteria":">15k views trong 7 ngày, <30 ngày tuổi, không nhạc bản quyền mạnh","fetchFrequency":"daily"},{"platform":"YouTube Shorts","contentType":"nutrition_education","keywords":["trái cây tươi","thực phẩm sạch","dinh dưỡng gia đình"],"filterCriteria":">5k views, <30 ngày, cho phép embed","fetchFrequency":"weekly"}],"remakeDirection":"Lấy video TikTok về trái cây/ẩm thực trending → Ghép với footage thực tế kho hàng + đóng gói Phú Hòa → Thêm text overlay giá/chất lượng + logo + CTA đặt hàng Zalo","contentVolume":"20-25 posts/tháng","autoSchedule":{"contentPerWeek":5,"platforms":["Facebook","Zalo OA","TikTok"],"bestTimes":["7h-8h","12h-13h","20h-22h"],"queueDays":7},"seedingAfterPost":{"commentWithinMinutes":20,"accountsPerPost":5,"replyToComments":true,"commentTypes":["Hỏi giao hàng khu vực","Khen chất lượng + hỏi giá combo","Tag bạn bè hay mua trái cây"],"escalationHours":4},"viralTriggers":["Nếu bài đạt >300 like trong 2h → boost thêm 100k ngân sách 24h","Nếu comment >30 → seeder thêm 3 account reply trong 30 phút","TikTok >8k view → đăng lại lên Facebook Reels ngay"],"brandGuidelines":["Không dùng nguyên video người khác — phải có footage kho/sản phẩm thực tế ≥40%","Logo Phú Hòa Fresh góc dưới phải, watermark nhẹ","Caption bắt đầu bằng pain point hoặc câu hỏi gợi tò mò","CTA cuối: Đặt hàng Zalo OA hoặc link đặt online"],"workflows":[{"name":"Comment/Inbox → Chatbot → CRM → Chốt","trigger":"Khách comment hoặc inbox trên Facebook/Zalo","steps":[{"step":1,"action":"Chatbot tự động reply trong 30 giây","tool":"chatbot","timing":"0-30 giây","responsible":"AI tự động"},{"step":2,"action":"Hỏi nhu cầu 3 câu (loại trái cây, số lượng, khu vực giao)","tool":"chatbot","timing":"1-3 phút","responsible":"AI tự động"},{"step":3,"action":"Push vào CRM với tag nguồn và nhu cầu","tool":"crm","timing":"ngay sau hội thoại","responsible":"AI tự động"},{"step":4,"action":"Seeder reply comment thật để tăng trust","tool":"marketing","timing":"trong 1 giờ đầu","responsible":"seeder"},{"step":5,"action":"Follow-up khách chưa chốt sau 24h qua Zalo ZNS","tool":"marketing","timing":"sau 24h","responsible":"AI tự động"}],"expectedResult":"Tỷ lệ chuyển đổi comment → đặt hàng > 20%","tools":["chatbot","crm","marketing"]},{"name":"Đăng bài → Seeding Boost → Viral Loop","trigger":"Bài mới được đăng từ lịch nội dung","steps":[{"step":1,"action":"Đăng bài tự động theo lịch","tool":"brandlabs","timing":"T+0","responsible":"AI tự động"},{"step":2,"action":"5 seeder comment trong vòng 20 phút","tool":"marketing","timing":"T+20 phút","responsible":"seeder"},{"step":3,"action":"Porter account reply và like các comment seeding","tool":"marketing","timing":"T+45 phút","responsible":"porter"},{"step":4,"action":"Nếu >100 tương tác: boost ngân sách thêm","tool":"marketing","timing":"T+2 giờ","responsible":"AI tự động"},{"step":5,"action":"Re-share vào group niche liên quan","tool":"marketing","timing":"T+4 giờ","responsible":"porter"}],"expectedResult":"Organic reach tăng 3-5x, tỷ lệ bài viral >15%","tools":["brandlabs","marketing"]}]}',
  TRUE,
  NOW(),
  NOW()
);
