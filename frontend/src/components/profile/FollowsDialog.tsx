import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { UserCheck, UserPlus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePosts } from "@/context/PostContext";

interface FollowsDialogProps {
    userId: string;
    username: string; // for title
    initialTab?: "followers" | "following";
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

interface UserListItem {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    is_following: boolean; // Am I following them?
    is_follower: boolean;  // Do they follow me? (for mutual check)
}

const FollowsDialog = ({ userId, username, initialTab = "followers", isOpen, onOpenChange }: FollowsDialogProps) => {
    const { isFollowing, followUser, unfollowUser, currentUser } = usePosts();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    // Fetch data when tab or open changes
    useEffect(() => {
        if (isOpen && userId) {
            fetchUsers();
        }
    }, [isOpen, activeTab, userId]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // 1. Get raw connections
            let rawData;
            if (activeTab === "followers") {
                const { data, error } = await supabase
                    .from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(id, full_name, username, avatar_url)')
                    .eq('following_id', userId);

                if (error) console.error("Error fetching followers:", error);
                rawData = data?.map((d: any) => d.profiles) || [];
            } else {
                const { data, error } = await supabase
                    .from('follows')
                    .select('following_id, profiles!follows_following_id_fkey(id, full_name, username, avatar_url)')
                    .eq('follower_id', userId);

                if (error) console.error("Error fetching following:", error);
                rawData = data?.map((d: any) => d.profiles) || [];
            }

            // Map to flat structure & use Context for follow status
            // Note: Since 'isFollowing' is updated via query invalidation, 
            // the component will re-render if context changes, but 'users' state won't update automatically 
            // unless we re-map it or remove 'is_following' from 'users' state and compute it during render.
            // Better to compute during render for status.

            // Actually, we store 'users' (the list of people). 
            // The 'is_following' boolean should be derived from context in the render loop.
            // So we don't need to store it in 'users' state.

            setUsers(rawData.map((u: any) => ({
                ...u,
                // We'll calculate these in render
                is_follower: false
            })));

        } catch (error) {
            console.error("Error fetching follows:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (e: React.MouseEvent, targetUser: UserListItem) => {
        e.stopPropagation();
        try {
            if (!currentUser?.id) {
                toast.error("Please log in to follow users");
                return;
            }
            if (currentUser.id === targetUser.id) return;

            setPendingMap(prev => ({ ...prev, [targetUser.id]: true }));

            const currentlyFollowing = isFollowing(targetUser.id);

            if (currentlyFollowing) {
                await unfollowUser(targetUser.id);
                toast.success(`Unfollowed ${targetUser.username}`);
            } else {
                await followUser(targetUser.id);
                toast.success(`Following ${targetUser.username}`);
            }
        } catch (err: any) {
            console.error("Exception in toggle:", err);
            toast.error("Failed to update follow status");
        } finally {
            setPendingMap(prev => ({ ...prev, [targetUser.id]: false }));
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 bg-card border-border overflow-hidden">
                <DialogHeader className="p-4 border-b border-border/50">
                    <DialogTitle className="text-center text-lg">{username}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="w-full rounded-none bg-muted/30 border-b border-border/50 p-0 h-10">
                        <TabsTrigger
                            value="followers"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            Followers
                        </TabsTrigger>
                        <TabsTrigger
                            value="following"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            Following
                        </TabsTrigger>
                    </TabsList>

                    <div className="p-2 border-b border-border/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 bg-muted/50 border-transparent focus:bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-[50vh] transition-all">
                        <div className="p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-sm">Loading connections...</span>
                                </div>
                            ) : filteredUsers.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {filteredUsers.map((user, idx) => {
                                        const isUserFollowing = isFollowing(user.id);
                                        const isMe = currentUser?.id === user.id;

                                        return (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <div
                                                    className="flex items-center gap-3 cursor-pointer group"
                                                    onClick={() => {
                                                        onOpenChange(false);
                                                        navigate(`/profile/${user.id}`);
                                                    }}
                                                >
                                                    <Avatar className="h-10 w-10 border border-border group-hover:scale-105 transition-transform">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                            {user.username}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {user.full_name}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                {!isMe && (
                                                    <Button
                                                        size="sm"
                                                        variant={isUserFollowing ? "outline" : "default"}
                                                        className={`h-8 px-3 text-xs ${isUserFollowing ? "border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : ""}`}
                                                        onClick={(e) => handleFollowToggle(e, user)}
                                                        disabled={pendingMap[user.id]}
                                                    >
                                                        {isUserFollowing ? (
                                                            pendingMap[user.id] ? "Updating..." : "Following"
                                                        ) : (
                                                            <>
                                                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                                                {pendingMap[user.id] ? "Updating..." : "Follow"}
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                                    <UserCheck className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No users found</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default FollowsDialog;
