import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yxwmvykxgucillhcnevo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4d212eWt4Z3VjaWxsaGNuZXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjM0MDUsImV4cCI6MjA5MzYzOTQwNX0.mtv-GQp5rjAJN6MRX7i7L43GWpYq2bdM1chWyI_1VQc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
