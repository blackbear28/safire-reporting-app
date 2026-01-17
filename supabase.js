// Supabase configuration for Storage only
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ghxhfyjjjdtyzxiwwehg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const STORAGE_BUCKET = 'report-images';
