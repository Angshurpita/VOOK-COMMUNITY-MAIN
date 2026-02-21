import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL, // Try standard env vars
});

async function inspectTriggers() {
    const client = await pool.connect();
    try {
        console.log("Connected to DB. Inspecting triggers on 'follows' table...");

        const query = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_orientation,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'follows';
    `;

        const res = await client.query(query);
        console.log("Triggers found:", res.rows.length);
        res.rows.forEach(r => {
            console.log(`\n--- Trigger: ${r.trigger_name} ---`);
            console.log(`Event: ${r.event_manipulation}`);
            console.log(`Timing: ${r.action_timing}`);
            console.log(`Statement: ${r.action_statement}`);
        });

        // Also get the function definitions
        console.log("\nInspecting relevant function definitions...");

        // We suspect 'create_follow_notification' or 'handle_new_follow'
        const funcQuery = `
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('create_follow_notification', 'handle_new_follow', 'handle_unfollow');
    `;

        const funcRes = await client.query(funcQuery);
        funcRes.rows.forEach(r => {
            console.log(`\n--- Function: ${r.routine_name} ---`);
            console.log(r.routine_definition);
        });

    } catch (err) {
        console.error("Error executing query:", err);
    } finally {
        client.release();
        pool.end();
    }
}

inspectTriggers();
