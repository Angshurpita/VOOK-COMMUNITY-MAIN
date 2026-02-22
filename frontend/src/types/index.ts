// User and Profile Types
export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  background_url?: string;
  college?: string;
  department?: string;
  passout_year?: string;
  bio?: string;
  gender?: string;
  dob?: string;
  followers?: number;
  following?: number;
  terms_accepted?: boolean;
  updated_at?: string;
}

// Post Types
export interface Post {
  id: string;
  user_id: string;
  content?: string;
  image_urls?: string[];
  video_url?: string;
  community_tag?: string;
  is_official?: boolean;
  is_anonymous?: boolean;
  upvotes?: number;
  comments_count?: number;
  created_at: string;
  profiles?: Profile;
  likes?: Like[];
  bookmarks?: Bookmark[];
}

// Interaction Types
export interface Like {
  user_id: string;
  post_id: string;
  created_at: string;
  is_anonymous?: boolean;
}

export interface Bookmark {
  user_id: string;
  post_id: string;
  created_at: string;
  is_anonymous?: boolean;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Story Types
export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption?: string;
  caption_settings?: Record<string, any>;
  filter_name?: string;
  campus_id?: string;
  visibility?: 'public' | 'campus' | 'followers';
  created_at: string;
  expires_at: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface StoryLike {
  id: string;
  story_id: string;
  user_id: string;
  created_at: string;
}

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// Chat Types
export interface Chat {
  id: string;
  type?: 'private' | 'group';
  community_id?: string;
  is_announcement?: boolean;
  name?: string;
  image_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  chat_id: string;
  user_id: string;
  role?: string;
  joined_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

// Notification Types
export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  type: 'follow' | 'like' | 'comment' | 'announcement' | 'message';
  content?: string;
  reference_id?: string;
  is_read?: boolean;
  created_at: string;
}

// Community Types
export interface Community {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  owner_id: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  has_more: boolean;
  page?: number;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Auth Types
export interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: AppError | null;
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}
