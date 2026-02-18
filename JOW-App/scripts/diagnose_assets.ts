
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for diagnosis (from .env)
const supabaseUrl = 'https://knugnescnjrchqmracsq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudWduZXNjbmpyY2hxbXJhY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDg3NjMsImV4cCI6MjA4NTk4NDc2M30.ySvHfJlh32n6-qTmUrU1oPpDk2tFq9lROYoAMW_VZq4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNOSIS START ---');

    console.log('1. Testing connection to "assets" table...');
    const { data, error } = await supabase.from('assets').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('ERROR:', error.message);
        if (error.code === '42P01') {
            console.error('DIAGNOSIS: Table "assets" DOES NOT EXIST in the database.');
            console.error('ACTION REQUIRED: Run the migration SQL in Supabase SQL Editor.');
        } else {
            console.error('DIAGNOSIS: Connection error or RLS blocking completely.');
        }
    } else {
        console.log('SUCCESS: Table "assets" exists and is reachable.');
        console.log('Row count (approx/visible to anon):', data); // Should be null or 0 if RLS is on

        // Try to select one row
        const { data: rows, error: rowError } = await supabase.from('assets').select('*').limit(1);
        if (rowError) {
            console.log('Fetch rows error:', rowError.message);
        } else {
            console.log('Fetch rows result:', rows);
            if (rows.length === 0) {
                console.log('DIAGNOSIS: Table exists but returns no rows to Anon (Expected behavior with RLS).');
                console.log('NOTE: To see data, you must be logged in as a specific user.');
            }
        }
    }
    console.log('--- DIAGNOSIS END ---');
}

diagnose();
