require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
    res.send('VOOK Backend API is running!');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example API route interacting with Supabase
app.get('/api/test-db', async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    try {
        // Replace 'profiles' with a table that actually exists in your DB
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        res.json({ message: 'Database connection successful', data });
    } catch (error) {
        // Cast error to any to access .message safely in strict JS environments
        const err = /** @type {any} */ (error);
        res.status(500).json({ error: err.message });
    }
});

// Error handling middleware
app.use((/** @type {any} */ err, /** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res, /** @type {import('express').NextFunction} */ next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
