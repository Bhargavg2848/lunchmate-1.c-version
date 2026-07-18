import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ukrztdeqzbbroowcphwk.supabase.co';
// Replace the string below with your actual Anon Key from the Dashboard
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnp0ZGVxemJicm9vd2NwaHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTkzOTgsImV4cCI6MjA5OTE5NTM5OH0.uNmeVbQh9dlWfm_hJkZWn-1gItJo-Q4d4L-xoqOYCHc'; 

export const supabase = createClient(supabaseUrl, supabaseKey);
