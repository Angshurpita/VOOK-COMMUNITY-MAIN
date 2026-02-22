require("dotenv").config();
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const { errorHandler, asyncHandler, notFoundHandler } = require('./middleware/errorHandler');
const { 
  generalLimiter, 
  authLimiter, 
  postLimiter, 
  interactionLimiter, 
  helmetConfig,
  validatePostCreation,
  validateProfileUpdate,
  validateUserId,
  validatePostId,
  validatePagination,
  validateProfileSearch,
  handleValidationErrors,
  sanitizeInput
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmetConfig);
app.use(sanitizeInput);
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Supabase Client (if env vars are present)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
/** @type {ReturnType<typeof createClient> | null} */
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
} else {
    console.log('⚠️ Supabase credentials missing in .env');
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'VOOK Backend API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Example API route interacting with Supabase
app.get('/api/test-db', asyncHandler(async (req, res) => {
    if (!supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
    
    res.json({ 
        message: 'Database connection successful', 
        data,
        timestamp: new Date().toISOString()
    });
}));

// Posts API endpoints
app.get('/api/posts', validatePagination, handleValidationErrors, optionalAuth, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { page = 1, limit = 20, community_tag } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (community_tag) {
        query = query.eq('community_tag', community_tag);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
        posts: data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            hasMore: offset + limit < count
        }
    });
}));

app.post('/api/posts', postLimiter, validatePostCreation, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { content, image_urls, community_tag, is_anonymous } = req.body;
    const user_id = req.user.id;

    const { data, error } = await supabase
        .from('posts')
        .insert({
            user_id,
            content,
            image_urls,
            community_tag,
            is_anonymous: is_anonymous || false
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        message: 'Post created successfully',
        post: data
    });
}));

// Profiles API endpoints
// Profile search endpoint for username lookups (must come before :userId route)
app.get('/api/profiles/search', validateProfileSearch, handleValidationErrors, optionalAuth, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { username } = req.query;

    let query = supabase.from('profiles').select('*');

    if (username.startsWith('@')) {
        query = query.eq('username', username);
    } else {
        query = query.eq('username', username);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Profile not found' });
        }
        throw error;
    }

    res.json({ profile: data });
}));

app.get('/api/profiles/:userId', validateUserId, handleValidationErrors, optionalAuth, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { userId } = req.params;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Profile not found' });
        }
        throw error;
    }

    res.json({ profile: data });
}));

app.put('/api/profiles', authLimiter, validateProfileUpdate, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const user_id = req.user.id;
    const updates = req.body;

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id)
        .select()
        .single();

    if (error) throw error;

    res.json({
        message: 'Profile updated successfully',
        profile: data
    });
}));

// Likes API endpoints
app.post('/api/posts/:postId/like', interactionLimiter, validatePostId, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { postId } = req.params;
    const user_id = req.user.id;
    const { is_anonymous = false } = req.body;

    const { error } = await supabase
        .from('likes')
        .insert({
            user_id,
            post_id: postId,
            is_anonymous
        });

    if (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Post already liked' });
        }
        throw error;
    }

    // Increment upvotes count
    await supabase.rpc('increment_upvotes', { row_id: postId });

    res.json({ message: 'Post liked successfully' });
}));

app.delete('/api/posts/:postId/like', interactionLimiter, validatePostId, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { postId } = req.params;
    const user_id = req.user.id;

    const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user_id)
        .eq('post_id', postId);

    if (error) throw error;

    // Decrement upvotes count
    await supabase.rpc('decrement_upvotes', { row_id: postId });

    res.json({ message: 'Post unliked successfully' });
}));

// Follow API endpoints
app.post('/api/profiles/:userId/follow', interactionLimiter, validateUserId, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { userId } = req.params;
    const follower_id = req.user.id;

    if (follower_id === userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const { error } = await supabase
        .from('follows')
        .insert({
            follower_id,
            following_id: userId
        });

    if (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Already following this user' });
        }
        throw error;
    }

    res.json({ message: 'User followed successfully' });
}));

app.delete('/api/profiles/:userId/follow', interactionLimiter, validateUserId, handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { userId } = req.params;
    const follower_id = req.user.id;

    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', follower_id)
        .eq('following_id', userId);

    if (error) throw error;

    res.json({ message: 'User unfollowed successfully' });
}));

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});
