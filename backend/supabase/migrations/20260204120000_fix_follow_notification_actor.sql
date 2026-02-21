-- Fix follow notification trigger: follows table has no user_id
-- This replaces handle_new_notification with safe actor assignment per table.

CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    recipient uuid;
    actor uuid;
    notif_type text;
    ent_type text;
    ent_id uuid;
    meta_data jsonb;
BEGIN
    IF (TG_TABLE_NAME = 'likes') THEN
        IF (NEW.is_active = false) THEN RETURN NULL; END IF;
        actor := NEW.user_id;
        SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
        notif_type := 'like';
        ent_type := 'post';
        ent_id := NEW.post_id;
        meta_data := '{}'::jsonb;

    ELSIF (TG_TABLE_NAME = 'comments') THEN
        actor := NEW.user_id;
        IF (NEW.parent_id IS NOT NULL) THEN
            SELECT user_id INTO recipient FROM public.comments WHERE id = NEW.parent_id;
            notif_type := 'reply';
            ent_type := 'comment';
            ent_id := NEW.post_id;
        ELSE
            SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
            notif_type := 'comment';
            ent_type := 'post';
            ent_id := NEW.post_id;
        END IF;
        meta_data := jsonb_build_object('snippet', substring(NEW.content from 1 for 50));

    ELSIF (TG_TABLE_NAME = 'follows') THEN
        actor := NEW.follower_id;
        recipient := NEW.following_id;
        notif_type := 'follow';
        ent_type := 'profile';
        ent_id := NEW.follower_id;
        meta_data := '{}'::jsonb;
    END IF;

    IF (recipient IS NOT NULL AND actor IS NOT NULL AND recipient != actor) THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, entity_type, entity_id, data)
        VALUES (recipient, actor, notif_type, ent_type, ent_id, meta_data);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
