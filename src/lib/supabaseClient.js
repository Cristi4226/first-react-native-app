// src/lib/supabaseClient.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb2xsdGdlZmF1Z3J4YWRzcnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0NTczNTksImV4cCI6MjA2MDAzMzM1OX0.A-L_2JOgfKEKETaDLdsArmLwNKa-dIED2Fr2LIw5sr4;

// ----> ASIGURĂ-TE CĂ AI 'export' AICI: <----
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});