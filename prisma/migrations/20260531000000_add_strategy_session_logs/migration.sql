-- Migration: 20260531000000_add_strategy_session_logs
-- Adds strategy_session_logs table to log RAG consult calls.
-- Uses CREATE TABLE IF NOT EXISTS — safe to run multiple times.
-- Table was pre-applied to production via one-off K8s job (already exists).

CREATE TABLE IF NOT EXISTS `strategy_session_logs` (
  `session_id`     CHAR(36)      NOT NULL,
  `user_id`        CHAR(36)      NOT NULL,
  `question`       TEXT          NOT NULL,
  `industry`       VARCHAR(50)   NULL,
  `business_size`  VARCHAR(20)   NULL,
  `current_tools`  JSON          NULL,
  `goal`           VARCHAR(50)   NULL,
  `chunks_used`    JSON          NULL,
  `actions_count`  INT           NOT NULL DEFAULT 0,
  `model`          VARCHAR(50)   NULL,
  `feedback_score` INT           NULL,
  `feedback_note`  VARCHAR(500)  NULL,
  `created_at`     DATETIME(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  INDEX `idx_ssl_user_created` (`user_id`, `created_at` DESC),
  INDEX `idx_ssl_industry_created` (`industry`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
