-- Replace the initial demo record with a complete payload including
-- sources, trends, and corePersona fields used by the frontend component.
-- Safe to re-run: DELETE + INSERT ensures exactly one demo row.

DELETE FROM `strategy_market_profiles`
WHERE `business_id` = 'demo' AND `user_id` IS NULL AND `is_demo` = TRUE;

INSERT INTO `strategy_market_profiles` (
  `strategy_market_profile_id`,
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
    'location', JSON_OBJECT(
      'region', 'Bình Dương',
      'city', 'Thủ Dầu Một',
      'stats', JSON_ARRAY(
        JSON_OBJECT('label', 'Dân số Bình Dương (ước cuối 2024)', 'value', '~3,1 triệu người'),
        JSON_OBJECT('label', 'Diện tích tự nhiên TDM', 'value', '118,67 km2'),
        JSON_OBJECT('label', 'Thu nhập bình quân (trích dẫn báo cáo tỉnh)', 'value', '8,937 triệu đồng/tháng'),
        JSON_OBJECT('label', 'Tỷ suất di cư thuần Bình Dương (DSGK 2024)', 'value', '77,6‰ (cao nhất cả nước)')
      ),
      'marketNotes', JSON_ARRAY(
        'Dân số ~3,1 triệu là số ước tính hành chính dựa trên báo cáo cuối năm 2024, có thể biến động mạnh do nhập cư cao.',
        'Thu nhập bình quân 8,937 triệu đồng/tháng là số liệu được trích dẫn trong các báo cáo tổng kết KT-XH của tỉnh, dựa theo Khảo sát mức sống dân cư (phương pháp chọn mẫu).'
      ),
      'sources', JSON_ARRAY(
        JSON_OBJECT(
          'title', 'Thành phố Thủ Dầu Một - Trang giới thiệu chính thức',
          'provider', 'Cổng thông tin điện tử TP Thủ Dầu Một',
          'updatedAt', 'Số liệu dân số ghi rõ: thống kê đến 01/04/2019',
          'accessedAt', 'Truy cập: 27/05/2026',
          'url', 'https://thanhphothudaumot.org.vn/about/thanh-pho-thu-dau-mot.html'
        ),
        JSON_OBJECT(
          'title', 'Bình Dương - tỉnh có thu nhập bình quân đầu người cao nhất cả nước',
          'provider', 'Congly.vn (trích dẫn số liệu báo cáo tỉnh)',
          'updatedAt', 'Ngày đăng: 23/05/2025',
          'accessedAt', 'Truy cập: 27/05/2026',
          'url', 'https://doanhnhan.congly.vn/binh-duong-tinh-co-thu-nhap-binh-quan-dau-nguoi-cao-nhat-ca-nuoc-479783.html'
        ),
        JSON_OBJECT(
          'title', 'Cổng thông tin điện tử tỉnh Bình Dương (báo cáo KT-XH tỉnh)',
          'provider', 'BinhDuong.gov.vn',
          'updatedAt', 'Theo kỳ báo cáo tổng kết năm 2024',
          'accessedAt', 'Truy cập: 27/05/2026',
          'url', 'https://www.binhduong.gov.vn/'
        ),
        JSON_OBJECT(
          'title', 'Thông cáo báo chí Kết quả Điều tra dân số và nhà ở giữa kỳ năm 2024',
          'provider', 'Cục Thống kê (NSO) - Bộ Tài chính',
          'updatedAt', 'Ngày đăng: 06/01/2025',
          'accessedAt', 'Truy cập: 27/05/2026',
          'url', 'https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2025/01/thong-cao-bao-chi-ket-qua-dieu-tra-dan-so-va-nha-o-giua-ky-nam-2024/'
        ),
        JSON_OBJECT(
          'title', 'Thông cáo báo chí Kết quả Khảo sát mức sống dân cư năm 2023',
          'provider', 'Cục Thống kê (NSO) - Bộ Tài chính',
          'updatedAt', 'Ngày đăng: 26/04/2024',
          'accessedAt', 'Truy cập: 27/05/2026',
          'url', 'https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2024/04/thong-cao-bao-chi-ket-qua-khao-sat-muc-song-dan-cu-nam-2023/'
        )
      )
    ),
    'demographics', JSON_OBJECT(
      'age', JSON_ARRAY(
        JSON_OBJECT('group', '18-24', 'pct', 25),
        JSON_OBJECT('group', '25-34', 'pct', 45),
        JSON_OBJECT('group', '35-44', 'pct', 20),
        JSON_OBJECT('group', '45+', 'pct', 10)
      ),
      'gender', JSON_OBJECT('male', 20, 'female', 80),
      'genderTargetNote', 'Tỷ lệ giới tính mục tiêu cho chiến dịch content/seeding (không phải cơ cấu dân số tự nhiên của địa bàn).'
    ),
    'behavior', JSON_ARRAY(
      JSON_OBJECT('name', 'Tin tưởng Review mxh', 'score', 95),
      JSON_OBJECT('name', 'Tính tiện lợi (Ship/App)', 'score', 90),
      JSON_OBJECT('name', 'Nhạy cảm về giá', 'score', 85),
      JSON_OBJECT('name', 'Thích Combo trọn gói', 'score', 80)
    ),
    'trends', JSON_ARRAY(
      JSON_OBJECT(
        'name', 'Ưu tiên trái cây tốt cho sức khỏe',
        'insight', 'Khách hàng đọc thành phần, quan tâm an toàn thực phẩm và nguồn gốc rõ ràng trước khi mua.',
        'impact', 'Content cần thiên về giá trị dinh dưỡng, chứng thực chất lượng và tư vấn theo nhu cầu thật.'
      ),
      JSON_OBJECT(
        'name', 'Nữ 25-40 mua cho cả gia đình',
        'insight', 'Phụ nữ là người ra quyết định chính cho bữa phụ trẻ nhỏ, người lớn tuổi và quà biếu trong gia đình.',
        'impact', 'Concept nên đi theo trục phụ nữ - gia đình: tiện, đẹp, an tâm và phù hợp nhiều thành viên.'
      ),
      JSON_OBJECT(
        'name', 'Hành vi mua theo khung giờ và ưu đãi',
        'insight', 'Khách phản hồi tốt vào khung trưa và tối, dễ chốt khi có combo/freeship/quà tặng nhỏ.',
        'impact', 'Lịch content cần chia khung giờ rõ ràng, ưu tiên bài deal ngắn gọn kèm CTA đặt nhanh.'
      )
    ),
    'corePersona', JSON_OBJECT(
      'title', 'Chân dung người dùng trọng tâm',
      'profile', 'Nữ 27-38 tuổi, sống tại Thủ Dầu Một/Bình Dương, thu nhập ổn định, bận rộn nhưng chú trọng sức khỏe gia đình.',
      'painPoints', JSON_ARRAY(
        'Khó chọn nơi bán trái cây vừa ngon vừa an toàn cho con và người lớn tuổi.',
        'Thiếu thời gian đi chợ, cần dịch vụ giao nhanh và đóng gói sạch đẹp.',
        'Ngại mua online nếu không có review thật và cam kết chất lượng rõ ràng.'
      ),
      'contentDirections', JSON_ARRAY(
        'Sức khỏe: nội dung dinh dưỡng dễ hiểu, thực đơn trái cây theo từng đối tượng.',
        'Phụ nữ: routine giữ dáng - đẹp da - bữa phụ văn phòng bằng trái cây premium.',
        'Gia đình: combo tuần cho nhà có trẻ nhỏ/người lớn tuổi, review phản hồi khách thật.'
      )
    )
  ),
  TRUE,
  NOW(),
  NOW()
);
