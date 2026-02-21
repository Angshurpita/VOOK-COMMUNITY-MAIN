
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignupValidation() {
    const email = "test_422_" + Date.now() + "@gmail.com";

    // Case 1: Short password
    console.log("1. Testing short password...");
    const { data: data1, error: error1 } = await supabase.auth.signUp({
        email,
        password: "123", // Too short
    });

    if (error1) {
        console.log("Short password error:", error1.status, error1.code, error1.message);
    } else {
        console.log("Short password success (User ID):", data1.user?.id);
    }

    // Case 2: Normal password
    console.log("\n2. Testing normal password...");
    const { data: data2, error: error2 } = await supabase.auth.signUp({
        email: "test_valid_" + Date.now() + "@gmail.com",
        password: "password123",
    });

    if (error2) {
        console.log("Normal password error:", error2.status, error2.code, error2.message);
    } else {
        console.log("Normal password success (User ID):", data2.user?.id);
    }
}

testSignupValidation();
