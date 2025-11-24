-- Create links table for storing shortened URLs
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(255) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_clicked_at TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create index on short_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);

-- Create index on user_id for user's links
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
