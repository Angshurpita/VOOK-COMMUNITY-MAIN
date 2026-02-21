
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
    console.log("Starting duplicate cleanup...");

    // 1. Fetch all PRIVATE chats
    const { data: chats, error: cError } = await supabase
        .from('chats')
        .select('id, created_at')
        .eq('type', 'private');

    if (cError) {
        console.error("Error fetching chats:", cError);
        return;
    }

    console.log(`Found ${chats.length} private chats.`);

    // 2. Fetch participants for these chats
    const chatIds = chats.map(c => c.id);
    // Fetch in chunks if needed, but for now assume it fits
    const { data: participants, error: pError } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('chat_id', chatIds);

    if (pError) {
        console.error("Error fetching participants:", pError);
        return;
    }

    // 3. Group by Chat ID -> User IDs
    const chatParticipants = new Map(); // chatId -> Set(userIds)
    participants.forEach(p => {
        if (!chatParticipants.has(p.chat_id)) {
            chatParticipants.set(p.chat_id, new Set());
        }
        chatParticipants.get(p.chat_id).add(p.user_id);
    });

    // 4. Group by User Pair -> List of Chats
    const pairToChats = new Map(); // string "userA_userB" -> [chatId1, chatId2, ...]

    for (const chat of chats) {
        const pSet = chatParticipants.get(chat.id);
        if (!pSet || pSet.size !== 2) {
            // Private chat should technically have 2 members. 
            // If 1 (self chat?) or >2 (broken private chat?), ignore for now or log.
            // console.log(`Skipping chat ${chat.id} with ${pSet ? pSet.size : 0} participants.`);
            continue;
        }

        const users = Array.from(pSet).sort();
        const key = users.join('_');

        if (!pairToChats.has(key)) {
            pairToChats.set(key, []);
        }
        pairToChats.get(key).push(chat);
    }

    // 5. Identify Duplicates
    let deletedCount = 0;

    for (const [pair, chatList] of pairToChats.entries()) {
        if (chatList.length > 1) {
            console.log(`Found ${chatList.length} chats for pair: ${pair}`);

            // Sort by created_at descending (newest first)
            // BUT actually we want to keep the one with MESSAGES.
            // Fetch message counts for these chats?
            // That's expensive. Let's just keep the OLDEST one? Or NEWEST?
            // Usually "latest" is better if the old one was abandoned. 
            // But if old one has history and new one is empty...

            // Strategy: Keep the one with the MOST messages. If tie, keep newest.

            const chatsWithMsgCounts = [];

            for (const c of chatList) {
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('chat_id', c.id);

                chatsWithMsgCounts.push({
                    ...c,
                    msgCount: count || 0
                });
            }

            // Sort: Primary = msgCount DESC, Secondary = created_at DESC (Active recently?)
            chatsWithMsgCounts.sort((a, b) => {
                if (b.msgCount !== a.msgCount) return b.msgCount - a.msgCount;
                return new Date(b.created_at) - new Date(a.created_at);
            });

            const winner = chatsWithMsgCounts[0];
            const losers = chatsWithMsgCounts.slice(1);

            console.log(`  Keeping: ${winner.id} (Messages: ${winner.msgCount})`);

            for (const loser of losers) {
                console.log(`  DELETING: ${loser.id} (Messages: ${loser.msgCount})`);

                // Delete messages first (cascade usually handles this but safety first)
                // Actually if we delete the chat, cascade should delete participants and messages.
                const { error: delError } = await supabase
                    .from('chats')
                    .delete()
                    .eq('id', loser.id);

                if (delError) {
                    console.error(`    Failed to delete ${loser.id}:`, delError);
                } else {
                    deletedCount++;
                }
            }
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} duplicate chats.`);
}

cleanupDuplicates();
