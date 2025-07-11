import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const testEmail = `testuser+${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`Creating test user with email: ${testEmail}`);
  
  // Create user directly in the database
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .insert([
      { 
        id: randomUUID(),
        username: `testuser_${Date.now()}`,
        email: testEmail,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();
  
  if (userError) {
    console.error('Error creating test user in database:', userError);
    return null;
  }
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: `Test User ${Date.now()}` }
  });
  
  if (authError) {
    console.error('Error creating auth user:', authError);
    return null;
  }
  
  console.log('Test user created successfully');
  return userData;
}

async function listTables() {
  try {
    console.log('Listing all tables in the database...');
    
    // First, let's try to list all tables using the Supabase API
    const { data: tables, error } = await supabase
      .rpc('get_all_tables')
      .select();
    
    if (error) {
      console.log('Could not list tables directly, trying alternative methods...');
      
      // If the RPC method doesn't exist, try to get tables by querying pg_catalog
      const { data: pgTables, error: pgError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (pgError) {
        console.error('Error querying pg_catalog.pg_tables:', pgError);
        throw pgError;
      }
      
      console.log('\n=== Database Tables ===');
      for (const table of pgTables) {
        console.log(`\nTable: ${table.tablename}`);
        
        // Try to get a single row from the table to infer its structure
        try {
          const { data: sampleData, error: sampleError } = await supabase
            .from(table.tablename)
            .select('*')
            .limit(1);
          
          if (sampleError) {
            console.log(`  Could not sample data: ${sampleError.message}`);
          } else if (sampleData && sampleData.length > 0) {
            console.log('  Sample row:', JSON.stringify(sampleData[0], null, 2));
          } else {
            console.log('  Table is empty');
          }
        } catch (e) {
          console.log(`  Error sampling data: ${e.message}`);
        }
      }
      
      return pgTables;
    }
    
    console.log('\n=== Database Tables ===');
    console.log(JSON.stringify(tables, null, 2));
    return tables;
    
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

async function checkInventory() {
  try {
    // First, let's list all tables to understand the schema
    await listTables();
    
    // Now try to find any existing users
    console.log('\nChecking for existing users...');
    
    // Try to find any user in the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    let userId;
    
    if (profiles && profiles.length > 0) {
      console.log(`Found existing profile:`, profiles[0]);
      userId = profiles[0].id;
    } else {
      console.log('No existing profiles found. Please create a user through the application first.');
      return;
    }
    
    // Now check or create inventory for this user
    await checkUserInventory(userId);
    
  } catch (error) {
    console.error('Error in checkInventory:', error);
  }
}

async function checkUserInventory(userId) {
  console.log(`\nChecking inventory for user ${userId}...`);
  
  // Get the player's inventory
  const { data: inventory, error: inventoryError } = await supabase
    .from('player_inventory')
    .select('*')
    .eq('player_id', userId)
    .limit(1);
  
  if (inventoryError) throw inventoryError;
  
  if (inventory.length === 0) {
    console.log('No inventory found for user. Creating a test inventory...');
    
    // Create a test inventory
    const { data: newInventory, error: createError } = await supabase
      .from('player_inventory')
      .insert([
        { 
          player_id: userId,
          humanoid_packs: 5,
          weapon_packs: 3,
          coins: 1000
        }
      ])
      .select();
    
    if (createError) throw createError;
    console.log('Created test inventory:', JSON.stringify(newInventory, null, 2));
  } else {
    console.log('Existing inventory:', JSON.stringify(inventory[0], null, 2));
  }
  
  // Get active timers for the user
  console.log('\nFetching active timers...');
  const { data: timers, error: timersError } = await supabase
    .from('active_timers')
    .select('*')
    .eq('player_id', userId)
    .limit(5);
  
  if (timersError) throw timersError;
  console.log('Active timers:', JSON.stringify(timers, null, 2));
  
  // Get player cards for the user
  console.log('\nFetching player cards...');
  const { data: cards, error: cardsError } = await supabase
    .from('player_cards')
    .select('*')
    .eq('player_id', userId)
    .limit(5);
  
  if (cardsError) throw cardsError;
  console.log('Player cards:', JSON.stringify(cards, null, 2));
}

checkInventory();
