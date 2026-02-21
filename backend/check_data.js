
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("--- Checking 'Followers only' posts ---");
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, user_id, community_tag, community_id')
        .eq('community_tag', 'Followers only');

    if (postsError) console.error("Error fetching posts:", postsError);
    else {
        console.log(`Found ${posts.length} posts with tag 'Followers only'`);
        posts.forEach(p => console.log(`- Post ${p.id} by User ${p.user_id}: ${p.content.substring(0, 20)}...`));
    }

    console.log("\n--- Checking Follows ---");
    const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('*');

    if (followsError) console.error("Error fetching follows:", followsError);
    else {
        console.log(`Found ${follows.length} follow relationships`);
        follows.forEach(f => console.log(`- ${f.follower_id} follows ${f.following_id}`));
    }
}

checkData();
