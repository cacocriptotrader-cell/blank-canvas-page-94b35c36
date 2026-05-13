import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgqdfzbfshgouejyidaq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncWRmemJmc2hnb3VlanlpZGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjY1ODIsImV4cCI6MjA5NDEwMjU4Mn0.tY4-mcVi7Clv09AmBJNRrw0h11TY460Y0gh2jacZjUY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
