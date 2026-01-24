import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_CONFIG = {
  url: 'https://vkthaoiurwuzuztpvuyl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGhhb2l1cnd1enV6dHB2dXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODM3MDksImV4cCI6MjA4MjY1OTcwOX0.GfQWCwW4I_PeHijgafPhBmBAlS2lqT8aw9UaIY8TdXY'
};

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

console.log('✅ Supabase inicializado correctamente');

