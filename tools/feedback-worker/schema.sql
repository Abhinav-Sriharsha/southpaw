-- South Paw · tools/feedback-worker/schema.sql
-- The one table. The Worker also creates it on its first request, so running this by hand is optional:
--   npx wrangler d1 execute southpaw-feedback --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS feedback (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT    NOT NULL,              -- when it arrived (UTC, ISO 8601)
  stars   INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text    TEXT    NOT NULL DEFAULT '',   -- the optional comment
  ctx     TEXT    NOT NULL,              -- training, match (CPU or online) or career
  result  TEXT    NOT NULL DEFAULT '',   -- win or loss (matches only)
  detail  TEXT    NOT NULL DEFAULT '',   -- CPU difficulty or career opponent id
  version TEXT    NOT NULL DEFAULT '',   -- game version
  device  TEXT    NOT NULL DEFAULT '',   -- touch or keys
  country TEXT    NOT NULL DEFAULT ''    -- from Cloudflare, two letters
);
CREATE INDEX IF NOT EXISTS feedback_created ON feedback (created);
