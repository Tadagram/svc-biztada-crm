-- CreateTable: strategy_action_plans
-- Stores Action Plan Community slide payload per business/user.
-- Seeded with demo data for the default strategy presentation (PHF 2026).

CREATE TABLE `strategy_action_plans` (
  `strategy_action_plan_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_action_plans_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_action_plans_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  PRIMARY KEY (`strategy_action_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed demo record (PHF 2026 — Action Plan Community)
INSERT INTO `strategy_action_plans` (
  `strategy_action_plan_id`,
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
  JSON_OBJECT(
    'timelineWeeks', JSON_ARRAY(5, 6, 7, 8, 9, 10, 11, 12),
    'phases', JSON_ARRAY(

      JSON_OBJECT(
        'name', '1. Thiết lập hệ thống ban đầu',
        'tasks', JSON_ARRAY(
          JSON_OBJECT(
            'name', 'Khảo sát group liên quan từ khóa Thủ Dầu Một, Bình Dương',
            'desc', 'Nghiên cứu người dùng đang tập trung ở group nào, lập danh sách group có trao đổi mạnh.',
            'goal', 'Danh sách group và đánh giá mức độ tương tác.',
            'qty', 'N/A',
            'timeline', 'Tuần 5-6',
            'startWeek', 5,
            'endWeek', 6
          ),
          JSON_OBJECT(
            'name', 'Xây dựng group cộng đồng trên Facebook',
            'desc', 'Mua group mới, tái sử dụng nội dung, gắn thương hiệu PHF tài trợ cộng đồng và đẩy 3 group chủ lực.',
            'goal', '3 group thành viên tốt, nội dung đủ mạnh để đè đối thủ.',
            'qty', '3 Groups',
            'timeline', 'Tuần 6-7',
            'startWeek', 6,
            'endWeek', 7
          ),
          JSON_OBJECT(
            'name', 'Thiết lập tài khoản Facebook cá nhân',
            'desc', 'Mua tài khoản cũ, lên bài nền, kết bạn mồi tại Bình Dương để phục vụ seeding an toàn.',
            'goal', '20 tài khoản có lịch sử hoạt động tốt, tăng uy tín hệ thống.',
            'qty', '20 FB cá nhân',
            'timeline', 'Tuần 6-8',
            'startWeek', 6,
            'endWeek', 8
          ),
          JSON_OBJECT(
            'name', 'Thiết lập fanpage cá nhân vệ tinh',
            'desc', 'Mỗi tài khoản tạo fanpage vệ tinh với tính cách khác nhau theo nhân khẩu học hộ gia đình.',
            'goal', 'Tạo cảm giác tự nhiên để seeding giống người thật.',
            'qty', '200 Fanpages',
            'timeline', 'Tuần 7-8',
            'startWeek', 7,
            'endWeek', 8
          ),
          JSON_OBJECT(
            'name', 'Khảo sát fanpage theo từ khóa địa phương',
            'desc', 'Khảo sát fanpage liên quan Thủ Dầu Một, Bình Dương, Mẹ và Bé và hành vi follow.',
            'goal', 'Nắm xu hướng quan tâm và hành vi thị trường mục tiêu.',
            'qty', 'N/A',
            'timeline', 'Tuần 7-8',
            'startWeek', 7,
            'endWeek', 8
          ),
          JSON_OBJECT(
            'name', 'Xây fanpage Săn Sale Thủ Dầu Một',
            'desc', 'Tổng hợp nội dung tự động, gắn tag khu vực/ngành hàng để điều hướng tâm lý mua sắm.',
            'goal', 'Fanpage hoàn chỉnh có luồng tổng hợp AI mỗi ngày.',
            'qty', '1 Fanpage',
            'timeline', 'Tuần 8-10',
            'startWeek', 8,
            'endWeek', 10
          ),
          JSON_OBJECT(
            'name', 'Khảo sát TikTok theo từ khóa địa phương',
            'desc', 'Xác định kênh và loại nội dung TikTok mà khách hàng mục tiêu theo dõi.',
            'goal', 'Danh sách kênh TikTok và hướng làm content.',
            'qty', 'N/A',
            'timeline', 'Tuần 8-9',
            'startWeek', 8,
            'endWeek', 9
          ),
          JSON_OBJECT(
            'name', 'Tạo hệ thống kênh TikTok vệ tinh',
            'desc', 'Tạo 1-3 kênh cộng đồng địa phương, nội dung chế lại để tránh flop.',
            'goal', 'Tạo độ phủ trên TikTok.',
            'qty', '3 TikTok',
            'timeline', 'Tuần 9-10',
            'startWeek', 9,
            'endWeek', 10
          ),
          JSON_OBJECT(
            'name', 'Tạo nhân vật AI làm KOC',
            'desc', 'Dùng AI tạo nhân vật có bộ ảnh/video để vận hành trên TikTok, Facebook, Instagram, Thread.',
            'goal', 'Bổ trợ truyền thông đa kênh, tăng độ phủ thương hiệu.',
            'qty', '1 TikTok, 1 FB, 1 Instagram, 1 Thread',
            'timeline', 'Tuần 9-10',
            'startWeek', 9,
            'endWeek', 10
          )
        )
      ),

      JSON_OBJECT(
        'name', '2. Vận hành hệ thống phủ',
        'tasks', JSON_ARRAY(
          JSON_OBJECT(
            'name', 'Tổng hợp nội dung đa nguồn và đăng group',
            'desc', 'AI tổng hợp từ website, group, fanpage; admin duyệt và build clip đăng vào group.',
            'goal', 'Mỗi ngày có nội dung hút dân Thủ Dầu Một/Bình Dương vào sinh hoạt cộng đồng.',
            'qty', 'N/A',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Tổng hợp nội dung quảng cáo brand địa phương lên fanpage',
            'desc', 'AI tổng hợp nội dung từ fanpage, admin chỉnh sửa và xuất bản định kỳ.',
            'goal', 'Fanpage luôn có bài mới để người dùng vào theo dõi.',
            'qty', 'N/A',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Seeding fanpage vào group và fanpage mục tiêu',
            'desc', 'Dùng 200 fanpage theo tính cách/nhân khẩu học để đẩy đề xuất tự nhiên và tăng trust kênh 0 đồng.',
            'goal', '200 bình luận seeding chia đều cho 3 group + 1 fanpage (random).',
            'qty', '200 cmt/ngày',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Quét nội dung TikTok và tái biên tập đăng lại',
            'desc', 'AI tổng hợp video theo tệp, admin chọn và chỉnh sửa để tránh vi phạm bản quyền/flop.',
            'goal', '1 nội dung/kênh/ngày, tổng 3 nội dung/ngày.',
            'qty', '3 nội dung/ngày',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Nuôi tệp 20 tài khoản chuẩn địa phương',
            'desc', 'Mỗi ngày kết bạn theo mạng lưới bạn bè tại Bình Dương, đăng bài đời sống và phản hồi bình luận.',
            'goal', '100 kết nối mới/ngày, khoảng 2000 kết nối mới/tháng.',
            'qty', '20 tài khoản',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Tự động trao đổi với người dùng qua fanpage/tài khoản',
            'desc', '200 fanpage + 20 tài khoản tự phản hồi theo nhân khẩu học để duy trì tương tác tự nhiên.',
            'goal', 'Duy trì hệ thống sống khỏe.',
            'qty', '220 điểm chạm',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Fanpage cá nhân tự đăng bài và trả lời bình luận',
            'desc', 'Tự động đăng bài và phản hồi bình luận mới theo cấu hình nhân khẩu học.',
            'goal', 'Duy trì hệ thống sống khỏe.',
            'qty', '200 Fanpages',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Nhân vật AI hoạt động đa nền tảng',
            'desc', 'Nhân vật AI tự đăng bài và phản hồi comment/inbox trên FB, TikTok, Instagram, Thread.',
            'goal', 'Duy trì hoạt động liên tục của nhân vật AI.',
            'qty', '4 kênh',
            'timeline', 'Liên tục',
            'startWeek', 9,
            'endWeek', 12
          )
        )
      ),

      JSON_OBJECT(
        'name', '3. Khai thác hệ thống',
        'tasks', JSON_ARRAY(
          JSON_OBJECT(
            'name', 'Treo banner theo yêu cầu chiến dịch',
            'desc', 'Đồng bộ banner trên toàn bộ fanpage/group theo yêu cầu từng chiến dịch.',
            'goal', 'Hiển thị đồng nhất trên toàn hệ thống.',
            'qty', 'Toàn hệ thống',
            'timeline', 'Theo chiến dịch',
            'startWeek', 10,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Seeding cho chiến dịch săn deals',
            'desc', 'Lên bài theo kế hoạch, bảo đảm lượng bình luận; tăng cường seeding cho nhân vật AI bằng 20 tài khoản.',
            'goal', 'Kéo traffic tối đa về chiến dịch.',
            'qty', 'Theo kế hoạch chiến dịch',
            'timeline', 'Theo chiến dịch',
            'startWeek', 10,
            'endWeek', 12
          ),
          JSON_OBJECT(
            'name', 'Cho fanpage cá nhân đi comment dạo có quà tặng',
            'desc', 'Triển khai quà tặng để fanpage vệ tinh comment như fan cứng PHF nhằm khuếch tán chiến dịch.',
            'goal', 'Đạt khả năng spam ~1000 bình luận/ngày.',
            'qty', '1000 cmt/ngày',
            'timeline', 'Theo chiến dịch',
            'startWeek', 10,
            'endWeek', 12
          )
        )
      )

    )
  ),
  TRUE,
  NOW(),
  NOW()
);
