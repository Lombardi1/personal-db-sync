import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhabwagcsvvluyvfztmp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYWJ3YWdjc3Z2bHV5dmZ6dG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDk3NDksImV4cCI6MjA3ODUyNTc0OX0.1PrBPmu1x0uE6xkiM5lIf_IgkGFRYBJy4X-t5MWIjgM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
