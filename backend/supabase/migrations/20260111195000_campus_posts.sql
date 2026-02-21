-- Add columns if they don't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS campus_id text;

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be clean (Assuming standard names, if created by user previously)
-- We will replace them with strict visibility logic
DROP POLICY IF EXISTS "Posts View Policy" ON posts;
DROP POLICY IF EXISTS "Posts Insert Policy" ON posts;
DROP POLICY IF EXISTS "campus_post_visibility" ON posts;
DROP POLICY IF EXISTS "campus_post_insert" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone." ON posts;
DROP POLICY IF EXISTS "Users can create posts." ON posts;

-- 1. VIEW POLICY
-- Users can see:
--  - Their own posts
--  - Public posts
--  - Campus posts IF they share the campus_id
--  - Private/Followers posts IF they are following (Optional, implemented for completeness)
CREATE POLICY "campus_post_visibility" ON posts
FOR SELECT
USING (
  -- 1. User is the author
  user_id = auth.uid()
  OR 
  -- 2. Post is Public (and NOT followers-only or campus-only implicitly handled by specific visibility checks)
  -- 2. Post is Public (and NOT followers-only or campus-only implicitly handled by specific visibility checks)
  visibility = 'public' OR visibility IS NULL
  OR 
  -- 3. Post is Campus-restricted AND user is in same campus
  (
    visibility = 'campus' 
    AND campus_id = (SELECT college FROM profiles WHERE id = auth.uid())
  )
  OR 
  -- 4. Post is Followers-restricted AND user is a follower
  (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM follows 
      WHERE follower_id = auth.uid() 
      AND following_id = posts.user_id
    )
  )
);

-- 2. INSERT POLICY
-- Enforce that valid campus_id is set if visibility is campus
CREATE POLICY "campus_post_insert" ON posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    (visibility = 'campus' AND campus_id = (SELECT college FROM profiles WHERE id = auth.uid()))
    OR (visibility != 'campus') -- No strict check for public/followers content other than user_id
  )
);
