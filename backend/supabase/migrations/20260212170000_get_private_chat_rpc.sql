-- Create a function to find an existing private chat between the current user and another user
CREATE OR REPLACE FUNCTION public.get_private_chat(other_user_id UUID)
RETURNS UUID AS $$
  SELECT c.id
  FROM public.chats c
  JOIN public.chat_participants cp1 ON cp1.chat_id = c.id
  JOIN public.chat_participants cp2 ON cp2.chat_id = c.id
  WHERE c.type = 'private'
  AND cp1.user_id = auth.uid()
  AND cp2.user_id = other_user_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
