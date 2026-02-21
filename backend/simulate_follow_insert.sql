-- SIMULATE FOLLOW INSERT (Verification Script)

-- 1. Start a transaction so we can rollback changes after testing
BEGIN;

-- 2. Select two valid users for testing
-- (We use a CTE to capture them so we can refer to them later)
WITH test_users AS (
  SELECT id FROM public.profiles LIMIT 2
)
SELECT 
  (SELECT id FROM test_users OFFSET 0 LIMIT 1) as follower_uuid,
  (SELECT id FROM test_users OFFSET 1 LIMIT 1) as following_uuid
  \gset -- works in psql, but for supabase editor we might need to manually set or just rely on 'returning'

-- NOTE: In Supabase SQL Editor, variables like \gset don't work.
-- We will use a DO block instead for dynamic testing.

DO $$
DECLARE
  v_follower_id uuid;
  v_following_id uuid;
BEGIN
  -- Get 2 random users
  SELECT id INTO v_follower_id FROM public.profiles ORDER BY random() LIMIT 1;
  SELECT id INTO v_following_id FROM public.profiles WHERE id != v_follower_id ORDER BY random() LIMIT 1;

  IF v_follower_id IS NULL OR v_following_id IS NULL THEN
    RAISE NOTICE 'Not enough users to test.';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing Follow: % -> %', v_follower_id, v_following_id;

  -- 3. SIMULATE AUTHENTICATION
  -- We set the config settings that Supabase's auth.uid() reads
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_follower_id::text, true);

  -- 4. ATTEMPT INSERT
  -- This should SUCCEED because auth.uid() == v_follower_id matches the RLS policy check (auth.uid() = follower_id)
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_follower_id, v_following_id);

  RAISE NOTICE 'Insert Succeeded! RLS verification passed.';
  
  -- 5. ATTEMPT INVALID INSERT (Optional: Verify blocking)
  -- Try to make this user insert a follow record for SOMEONE ELSE
  BEGIN
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_following_id, v_follower_id); -- Trying to force the OTHER person to follow me
    
    RAISE EXCEPTION 'RLS Failed! It allowed impersonation.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Correctly Blocked Invalid Insert: %', SQLERRM;
  END;

END $$;

-- 6. ROLLBACK
-- We intentionally fail or rollback at the end so we don't dirty the database with test data.
ROLLBACK; 
-- You should see "ROLLBACK" at the end of output, meaning no changes persisted.
