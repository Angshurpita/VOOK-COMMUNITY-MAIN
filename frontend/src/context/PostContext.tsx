import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PostComment {
    id: string;
    author: string;
    avatar?: string;
    initials: string;
    content: string;
    timestamp: string;
}

export interface FeedPostData {
    id: string;
    author: {
        name: string;
        username: string;
        avatar?: string;
        initials: string;
        college: string;
        id?: string;
    };
    communityTag?: string;
    isOfficial?: boolean;
    isAnonymous?: boolean;
    timestamp: string;
    content: string;
    images?: string[];
    hasVideo?: boolean;
    videoThumbnail?: string;
    upvotes: number;
    comments: number;
    isUpvoted?: boolean;
    userReaction?: string;
    isBookmarked?: boolean;
    previewComments?: PostComment[];
    poll?: {
        question: string;
        options: { text: string; percentage: number; isSelected?: boolean }[];
        totalVotes: number;
    };
    documents?: {
        name: string;
        size: string;
        url: string;
        type: string;
    }[];
    communityId?: string;
    postType?: 'personal' | 'community';
    visibility?: 'public' | 'campus' | 'followers';
}

interface PostContextType {
    posts: FeedPostData[];
    fetchPosts: (filter?: string) => Promise<void>;
    addPost: (post: Omit<FeedPostData, "id" | "timestamp" | "upvotes" | "comments">) => Promise<boolean>;
    toggleUpvote: (id: string) => Promise<void>;
    reactToPost: (id: string, type: string) => Promise<void>;
    toggleBookmark: (id: string) => Promise<void>;
    currentUser: {
        name: string;
        username: string;
        avatar?: string;
        initials: string;
        college: string;
        id?: string;
    };
    isAnonymousMode: boolean;
    toggleAnonymousMode: () => void;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    unreadNotifications: number;
    markNotificationsAsRead: () => void;
    unreadMessages: number;
    refreshUnreadMessages: () => Promise<void>;
    markMessagesAsRead: () => void;
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
    isFollowing: (userId: string) => boolean;
    followUser: (userId: string) => Promise<void>;
    unfollowUser: (userId: string) => Promise<void>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("all");
    const [isAnonymousMode, setIsAnonymousMode] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    // --- User Profile Query ---
    const { data: currentUser, refetch: refreshProfile } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { name: "Guest", username: "@guest", initials: "G", college: "Campus", avatar: undefined };
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                return {
                    name: profile.full_name || "User",
                    username: profile.username || "@user",
                    avatar: profile.avatar_url,
                    initials: (profile.full_name || "U")[0].toUpperCase(),
                    college: profile.college || "Campus",
                    id: user.id
                };
            } else {
                // Fallback / Auto-create logic if needed, or just return basic info
                return {
                    name: user.user_metadata.full_name || "User",
                    username: "@user",
                    initials: "U",
                    college: "Campus",
                    id: user.id
                };
            }
        },
        staleTime: Infinity, // User profile rarely changes instantly
    });

    // --- Following Query ---
    const { data: followingIds = new Set<string>(), refetch: refreshFollowing } = useQuery({
        queryKey: ['following', currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) return new Set<string>();
            const { data } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUser.id);
            return new Set(data?.map(d => d.following_id));
        },
        enabled: !!currentUser?.id,
        staleTime: Infinity
    });

    const isFollowing = (userId: string) => followingIds.has(userId);

    const followMutation = useMutation({
        mutationFn: async (userId: string) => {
            if (!currentUser?.id) throw new Error("Not logged in");
            const { error } = await supabase.from('follows').insert({
                follower_id: currentUser.id,
                following_id: userId
            });
            if (error) throw error;
            return userId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['following'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] }); // Update feed if needed
        }
    });

    const unfollowMutation = useMutation({
        mutationFn: async (userId: string) => {
            if (!currentUser?.id) throw new Error("Not logged in");
            const { error } = await supabase.from('follows').delete().match({
                follower_id: currentUser.id,
                following_id: userId
            });
            if (error) throw error;
            return userId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['following'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
    });

    const followUser = async (userId: string) => {
        // Optimistic update
        queryClient.setQueryData(['following', currentUser?.id], (old: Set<string> | undefined) => {
            const newSet = new Set(old || []);
            newSet.add(userId);
            return newSet;
        });
        try {
            await followMutation.mutateAsync(userId);
        } catch (e) {
            refreshFollowing(); // Revert on error
            toast.error("Failed to follow user");
        }
    };

    const unfollowUser = async (userId: string) => {
        // Optimistic update
        queryClient.setQueryData(['following', currentUser?.id], (old: Set<string> | undefined) => {
            const newSet = new Set(old || []);
            newSet.delete(userId);
            return newSet;
        });
        try {
            await unfollowMutation.mutateAsync(userId);
        } catch (e) {
            refreshFollowing();
            toast.error("Failed to unfollow user");
        }
    };


    // --- Posts Query ---
    const { data: posts = [], isLoading, refetch: refetchPosts } = useQuery({
        queryKey: ['posts', filter, isAnonymousMode, currentUser?.id, Array.from(followingIds).join(',')], // Dependencies
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Use the already fetched followingIds if available/consistent, 
            // but for safety in the posts logic we can re-derive or use the passed Set.
            // Actually, we can just use the `followingIds` from the scope if we trust it's up to date.
            // Since we added it to queryKey, this query will re-run when followingIds changes.

            // ... (rest of queryFn logic using followingIds from scope or re-fetching) ...
            // I'll keep the logic mostly self-contained or use the scope variable to be cleaner.

            // 1. User check
            if (user) {
                // Ensure followingIds is populated if we rely on it, but the scope variable `followingIds` is from the OTHER query.
                // It might be stale relative to this run if they run in parallel? 
                // Actually if `followingIds` changed, this component re-rendered, and `queryKey` changed, so this runs.
                // So `followingIds` (scope) is fresh.
            }

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, full_name, username, avatar_url, college),
                    post_likes!left(count),
                    post_comments!left(count)
                `)
                .order('created_at', { ascending: false });

            if (filter === "campus") {
                query = supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles!inner(id, full_name, username, avatar_url, college),
                        post_likes!left(count),
                        post_comments!left(count)
                    `)
                    .order('created_at', { ascending: false })
                    .eq('community_tag', 'Campus Only')
                    .eq('profiles.college', currentUser?.college);
            } else if (filter === "followers") {
                // For "Followers only" tag: Show posts tagged 'Followers only' 
                // made by people I follow (plus my own)
                const followingArray = Array.from(followingIds);
                if (followingArray.length > 0) {
                    query = query
                        .eq('community_tag', 'Followers only')
                        .in('user_id', followingArray);
                } else {
                    // If following no one, show nothing or just own
                    query = query.eq('community_tag', 'Followers only').eq('user_id', currentUser?.id);
                }
            } else {
                // Default / Trending: Show "Anyone" posts
                // Assuming 'Anyone' is the tag for public posts, or null. 
                // If the tag is explicitly 'Anyone':
                query = query.or('community_tag.eq.Anyone,community_tag.is.null');

                // Note: Does 'Trending' include Campus/Followers posts? 
                // Usually "For You" does, but "Anyone" tab suggests just public posts.
                // Given the prompt "according to the tags ... trending posts", I'll assume 
                // "Trending" just sorts these public posts or is a separate view. 
                // User mentioned: "anyone,campus only,followers only and trending posts"
                // So they likely treat them as disjoint categories based on tags.
            }

            query = query.is('community_id', null);

            const { data: postsData, error } = await query;
            if (error) throw error;

            // Get User's Likes & Bookmarks
            const myLikedPostIds = new Set<string>();
            let userBookmarks: string[] = [];

            if (user) {
                const { data: myLikes } = await supabase
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', user.id);
                myLikes?.forEach(l => myLikedPostIds.add(l.post_id));

                const { data: bookmarksResult } = await supabase
                    .from('bookmarks')
                    .select('post_id')
                    .eq('user_id', user.id);
                if (bookmarksResult) userBookmarks = bookmarksResult.map(b => b.post_id);
            }

            return (postsData || [])
                .filter(p => {
                    // Backend RLS handles the main security. 
                    // We just do a safety check to ensure UI doesn't glitch if cache is stale.
                    if (filter === 'followers' && p.community_tag !== 'Followers only') return false;
                    return true;
                })
                .map(p => {
                    const isAnon = p.is_anonymous;
                    const isOwnPost = user && user.id === p.user_id;
                    const likeCount = p.post_likes?.[0]?.count || 0;
                    const commentCount = p.post_comments?.[0]?.count || 0;

                    return {
                        id: p.id,
                        author: isAnon ? {
                            name: "Anonymous User",
                            username: "@anonymous",
                            avatar: undefined,
                            initials: "?",
                            college: "Hidden",
                            id: isOwnPost ? p.user_id : undefined
                        } : {
                            name: p.profiles?.full_name || "Unknown",
                            username: p.profiles?.username || "@unknown",
                            avatar: p.profiles?.avatar_url,
                            initials: (p.profiles?.full_name || "U")[0].toUpperCase(),
                            college: p.profiles?.college || "Campus",
                            id: p.profiles?.id
                        },
                        communityTag: p.community_tag,
                        isOfficial: p.is_official,
                        isAnonymous: isAnon,
                        timestamp: new Date(p.created_at).toLocaleDateString(),
                        content: p.content,
                        images: p.image_urls,
                        hasVideo: !!p.video_url,
                        videoThumbnail: undefined,
                        upvotes: likeCount,
                        comments: commentCount,
                        isUpvoted: myLikedPostIds.has(p.id),
                        userReaction: myLikedPostIds.has(p.id) ? '👍' : undefined,
                        isBookmarked: userBookmarks.includes(p.id),
                        previewComments: [],
                        postType: p.post_type || (p.community_id ? 'community' : 'personal'),
                        communityId: p.community_id
                    } as FeedPostData;
                });
        },
        staleTime: 1000 * 60, // 1 minute stale time
    });

    // --- Unread Notifications ---
    const { data: unreadNotifications = 0, refetch: fetchUnreadCount } = useQuery({
        queryKey: ['notifications', 'unread', currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) return 0;
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false);
            return count || 0;
        },
        enabled: !!currentUser?.id,
        refetchInterval: 30000 // Poll every 30s as backup to realtime
    });

    // --- Unread Messages ---
    const { data: unreadMessages = 0, refetch: fetchUnreadMessageCount } = useQuery({
        queryKey: ['messages', 'unread', currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) return 0;
            const { data: myChats } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', currentUser.id);

            const chatIds = myChats?.map(c => c.chat_id) || [];
            if (chatIds.length === 0) return 0;

            let query = supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('chat_id', chatIds)
                .neq('sender_id', currentUser.id)
                .is('read_at', null);

            // Exclude current chat if active (handled by realtime usually, but good for initial fetch)
            // Note: Optimistic updates handle immediate read status

            const lastCheck = localStorage.getItem('lastChatCheck');
            if (lastCheck) {
                query = query.gt('created_at', lastCheck);
            }

            const { count } = await query;
            return count || 0;
        },
        enabled: !!currentUser?.id,
        refetchInterval: 15000
    });


    // --- Mutations ---
    const addPostMutation = useMutation({
        mutationFn: async (newPostData: Omit<FeedPostData, "id" | "timestamp" | "upvotes" | "comments">) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const postPayload = {
                user_id: user.id,
                content: newPostData.content,
                image_urls: newPostData.images || [],
                community_tag: newPostData.communityTag,
                community_id: newPostData.communityId,
                post_type: newPostData.postType || 'personal',
                is_official: false,
                is_anonymous: isAnonymousMode,
                created_at: new Date().toISOString(),
                upvotes: 0,
                comments_count: 0,
                visibility: newPostData.visibility || (newPostData.communityTag === 'Followers only' ? 'followers' : newPostData.communityTag === 'Campus Only' ? 'campus' : 'public')
            };

            const { error } = await supabase.from('posts').insert(postPayload);
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
    });

    // --- Actions ---

    const fetchPosts = async (newFilter?: string) => {
        if (newFilter && newFilter !== filter) {
            setFilter(newFilter);
            return;
        }

        const existing = queryClient.getQueryData(['posts', filter, isAnonymousMode, currentUser?.id, Array.from(followingIds).join(',')]);
        if (existing && Array.isArray(existing) && existing.length >= 0) {
            return;
        }

        await refetchPosts();
    };

    const toggleAnonymousMode = () => setIsAnonymousMode(prev => !prev);

    const markNotificationsAsRead = () => {
        // Optimistic
        queryClient.setQueryData(['notifications', 'unread', currentUser?.id], 0);
    };

    const markMessagesAsRead = () => {
        queryClient.setQueryData(['messages', 'unread', currentUser?.id], 0);
        localStorage.setItem('lastChatCheck', new Date().toISOString());
    };


    // --- Realtime Subscriptions ---
    useEffect(() => {
        const postsChannel = supabase
            .channel('public:posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                queryClient.invalidateQueries({ queryKey: ['posts'] });
            })
            .subscribe();

        const notifChannel = supabase
            .channel('public:notifications_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
                const newNotif = payload.new as any;
                if (currentUser?.id && (newNotif.receiver_id === currentUser.id || newNotif.recipient_id === currentUser.id)) {
                    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
                }
            })
            .subscribe();

        const msgChannel = supabase
            .channel('global_unread_messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
            })
            .subscribe();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                queryClient.invalidateQueries();
            } else if (event === 'SIGNED_OUT') {
                queryClient.clear();
                setIsAnonymousMode(false);
            }
        });

        return () => {
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(notifChannel);
            supabase.removeChannel(msgChannel);
            subscription.unsubscribe();
        };
    }, [queryClient, currentUser?.id]);


    // Legacy function support (wrappers)
    const addPost = async (post: any) => {
        try {
            await addPostMutation.mutateAsync(post);
            return true;
        } catch (e: any) {
            toast.error(e.message);
            return false;
        }
    };

    const toggleUpvote = async (id: string) => {
        // Optimistic update logic for LIKE
        queryClient.setQueryData(['posts', filter, isAnonymousMode, currentUser?.id, Array.from(followingIds).join(',')], (old: FeedPostData[] | undefined) => {
            if (!old) return [];
            return old.map(p => {
                if (p.id !== id) return p;
                const wasUpvoted = p.isUpvoted;
                return {
                    ...p,
                    isUpvoted: !wasUpvoted,
                    upvotes: wasUpvoted ? p.upvotes - 1 : p.upvotes + 1,
                    userReaction: wasUpvoted ? undefined : '👍'
                };
            });
        });

        // Actual API Call (simplified)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // Check existence
            const { data: check } = await supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
            if (check) {
                await supabase.from("post_likes").delete().eq("id", check.id);
            } else {
                await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
            }
            // No need to invalidate immediately if optimistic succeeded, but good practice eventually
        } catch (e) {
            queryClient.invalidateQueries({ queryKey: ['posts'] }); // Revert on error
        }
    };

    // Legacy support alias
    const reactToPost = (id: string, type: string) => toggleUpvote(id);

    const toggleBookmark = async (id: string) => {
        // Optimistic Bundle
        queryClient.setQueryData(['posts', filter, isAnonymousMode, currentUser?.id, Array.from(followingIds).join(',')], (old: FeedPostData[] | undefined) => {
            if (!old) return [];
            return old.map(p => p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p);
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Very basic toggle logic matching previous implementation
        const { count } = await supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('post_id', id);
        if (count && count > 0) {
            await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', id);
        } else {
            await supabase.from('bookmarks').insert({ user_id: user.id, post_id: id, is_anonymous: isAnonymousMode });
        }
    };

    return (
        <PostContext.Provider
            value={{
                posts,
                fetchPosts,
                addPost,
                toggleUpvote,
                reactToPost,
                toggleBookmark,
                currentUser: currentUser || { name: "Guest", username: "@guest", initials: "G", college: "Campus", avatar: undefined },
                isAnonymousMode,
                toggleAnonymousMode,
                isLoading,
                refreshProfile: async () => { await refreshProfile(); },
                unreadNotifications,
                markNotificationsAsRead,
                unreadMessages,
                refreshUnreadMessages: async () => { await fetchUnreadMessageCount(); },
                markMessagesAsRead,
                activeChatId,
                setActiveChatId,
                // New Exports
                isFollowing,
                followUser,
                unfollowUser
            }}
        >
            {children}
        </PostContext.Provider>
    );
};

export const usePosts = () => {
    const context = useContext(PostContext);
    if (context === undefined) {
        throw new Error("usePosts must be used within a PostProvider");
    }
    return context;
};
