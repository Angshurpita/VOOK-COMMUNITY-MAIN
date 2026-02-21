
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDuplicateSignUp() {
    const email = "test_duplicate_" + Date.now() + "@gmail.com";
    const password = "password123";

    console.log(`1. Signing up ${email}...`);
    const { data: data1, error: error1 } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error1) {
        console.error("First signup failed:", error1);
        return;
    }
    console.log("First signup success. User ID:", data1.user?.id);

    console.log("2. Attempting duplicate signup...");
    const { data: data2, error: error2 } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error2) {
        console.log("caught expected error:", error2.message);
    } else {
        console.log("Duplicate signup did NOT error.");
        console.log("User ID returned:", data2.user?.id);
        console.log("Identities:", data2.user?.identities);

        if (data2.user?.identities?.length === 0) {
            console.log("Identities is empty -> Indicates user already exists (if email confirmation is on)");
        }
        if (data1.user?.id === data2.user?.id) {
            console.log("User IDs MATCH.");
        } else {
            console.log("User IDs DIFFER (New account created?).");
        }
    }
}

testDuplicateSignUp();
