-- Migrate user permission overrides from table `user_permissions`
-- into `users.custom_fields.permission_overrides` JSON structure.

WITH
    overrides AS (
        SELECT up.user_id, COALESCE(
                array_agg(DISTINCT p.code) FILTER (
                    WHERE
                        up.permission_type::text = 'allow'
                ), ARRAY[]::text []
            ) AS allow_codes, COALESCE(
                array_agg(DISTINCT p.code) FILTER (
                    WHERE
                        up.permission_type::text = 'deny'
                ), ARRAY[]::text []
            ) AS deny_codes
        FROM
            user_permissions up
            JOIN permissions p ON p.permission_id = up.permission_id
        GROUP BY
            up.user_id
    )
UPDATE users u
SET
    custom_fields = jsonb_strip_nulls(
        COALESCE(u.custom_fields, '{}'::jsonb) || jsonb_build_object(
            'permission_overrides',
            jsonb_strip_nulls(
                jsonb_build_object(
                    'allow',
                    CASE
                        WHEN cardinality(o.allow_codes) > 0 THEN to_jsonb(o.allow_codes)
                        ELSE NULL
                    END,
                    'deny',
                    CASE
                        WHEN cardinality(o.deny_codes) > 0 THEN to_jsonb(o.deny_codes)
                        ELSE NULL
                    END
                )
            )
        )
    )
FROM overrides o
WHERE
    u.user_id = o.user_id;

DROP TABLE IF EXISTS user_permissions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PermissionType') THEN
    DROP TYPE "PermissionType";
  END IF;
END
$$;