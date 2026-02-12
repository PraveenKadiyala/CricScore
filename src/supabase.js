import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://bqpuenfzarskiyvyyucj.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcHVlbmZ6YXJza2l5dnl5dWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTA3NDEsImV4cCI6MjA4NjQ2Njc0MX0.LNDf8WTx35OC-StObji9xQM8guuqhDpS2YyAXel3_3w"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
