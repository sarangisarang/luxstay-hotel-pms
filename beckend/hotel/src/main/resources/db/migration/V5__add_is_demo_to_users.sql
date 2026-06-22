ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_demo = TRUE WHERE email IN ('admin@demo.com','reception@demo.com','guest@demo.com');
