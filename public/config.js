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

/*

// config.js - Configuración de Supabase

// Envolver en IIFE para evitar conflictos globales
(function() {
  'use strict';
  
  // Si ya existe, no reinicializar
  if (window.supabaseClient) {
    console.log('⚠️ Supabase ya estaba inicializado');
    return;
  }
  
  // Verificar que el CDN cargó
  if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
    console.error('❌ ERROR: Supabase CDN no cargó correctamente');
    return;
  }
  
  var SUPABASE_CONFIG = {
    url: 'https://vkthaoiurwuzuztpvuyl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGhhb2l1cnd1enV6dHB2dXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODM3MDksImV4cCI6MjA4MjY1OTcwOX0.GfQWCwW4I_PeHijgafPhBmBAlS2lqT8aw9UaIY8TdXY'
  };
  
  // Crear cliente y guardarlo globalmente
  try {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    
    console.log('✅ Supabase inicializado correctamente');
    console.log('URL:', SUPABASE_CONFIG.url);
    
  } catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
  }
})();

// Variable global para acceso fácil (usa var para permitir redeclaración)
var supabase = window.supabaseClient;

*/