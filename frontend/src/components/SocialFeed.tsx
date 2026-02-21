import FeedPost, { FeedPostData } from "./FeedPost";
import { usePosts } from "@/context/PostContext";
import { FilterTab } from "./CreatePostBox";
import { Virtuoso } from "react-virtuoso";

interface SocialFeedProps {
  filter?: FilterTab;
}

const SocialFeed = ({ filter = "all" }: SocialFeedProps) => {
  const { posts, toggleUpvote, toggleBookmark, currentUser } = usePosts();

  const handlePostClick = (id: string) => {
    console.log("Open post:", id);
  };

  const filteredPosts = posts.filter(post => {
    if (filter === "campus") {
      // Show if tagged 'Campus Only' AND matches user's college
      return post.communityTag === "Campus Only" && (post.author.college === currentUser?.college);
    }
    if (filter === "followers") {
      return post.communityTag === "Followers only";
    }
    // "trending" or "all" -> Show public posts
    return !post.communityTag || post.communityTag === "Anyone";
  });

  const displayPosts = filter === "trending"
    ? [...filteredPosts].sort((a, b) => b.upvotes - a.upvotes)
    : filteredPosts;

  return (
    <div className="flex flex-col gap-4 min-h-[500px]">
      {displayPosts.length > 0 ? (
        <Virtuoso
          useWindowScroll
          data={displayPosts}
          itemContent={(index, post) => (
            <div className="mb-4">
              <FeedPost
                key={post.id}
                post={post}
                onUpvote={toggleUpvote}
                onBookmark={toggleBookmark}
                onClick={handlePostClick}
              />
            </div>
          )}
        />
      ) : (
        <div className="text-center py-10 text-muted-foreground">No posts to show</div>
      )}
    </div>
  );
};

export default SocialFeed;
