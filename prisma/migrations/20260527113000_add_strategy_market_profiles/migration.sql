CREATE TABLE `strategy_market_profiles` (
  `strategy_market_profile_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_market_profiles_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_market_profiles_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  PRIMARY KEY (`strategy_market_profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
      'region', 'Binh Duong',
      'city', 'Thu Dau Mot',
      'stats', JSON_ARRAY(
        JSON_OBJECT('label', 'Dan so Binh Duong (uoc cuoi 2024)', 'value', '~3,1 trieu nguoi'),
        JSON_OBJECT('label', 'Dien tich tu nhien TDM', 'value', '118,67 km2'),
        JSON_OBJECT('label', 'Thu nhap binh quan (trich dan bao cao tinh)', 'value', '8,937 trieu dong/thang'),
        JSON_OBJECT('label', 'Ty suat di cu thuan Binh Duong (DSGK 2024)', 'value', '77,6‰ (cao nhat ca nuoc)')
      ),
      'marketNotes', JSON_ARRAY(
        'Dan so ~3,1 trieu la so uoc tinh hanh chinh dua tren bao cao cuoi nam 2024, co the bien dong manh do nhap cu cao.',
        'Thu nhap binh quan 8,937 trieu dong/thang la so lieu duoc trich dan trong cac bao cao tong ket KT-XH cua tinh.'
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
      'genderTargetNote', 'Ty le gioi tinh muc tieu cho chien dich content/seeding (khong phai co cau dan so tu nhien cua dia ban).'
    ),
    'behavior', JSON_ARRAY(
      JSON_OBJECT('name', 'Tin tuong Review mxh', 'score', 95),
      JSON_OBJECT('name', 'Tinh tien loi (Ship/App)', 'score', 90),
      JSON_OBJECT('name', 'Nhay cam ve gia', 'score', 85),
      JSON_OBJECT('name', 'Thich Combo tron goi', 'score', 80)
    )
  ),
  true,
  NOW(),
  NOW()
);
