// public/template/core/auth-integration.js
export class AuthIntegration {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.user = null;
    this.profile = null;
  }
  
  async init() {
    try {
      // Obtener sesión actual
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (!session) {
        this.redirectToLogin();
        return null;
      }
      
      this.user = session.user;
      
      // Cargar perfil adicional si existe tabla profiles
      await this.loadProfile();
      
      // Escuchar cambios de autenticación
      this.setupAuthListener();
      
      return this.getUserData();
    } catch (error) {
      console.error('Error en auth integration:', error);
      this.redirectToLogin();
      return null;
    }
  }
  
  async loadProfile() {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();
      
      if (!error && data) {
        this.profile = data;
      }
    } catch (error) {
      console.warn('No se pudo cargar perfil adicional:', error);
      // No es crítico, continuar sin perfil extendido
    }
  }
  
  setupAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.redirectToLogin();
      } else if (event === 'TOKEN_REFRESHED') {
        this.user = session.user;
      }
    });
  }
  
  getUserData() {
    if (!this.user) return null;
    
    return {
      id: this.user.id,
      email: this.user.email,
      name: this.profile?.full_name || this.user.user_metadata?.full_name || 'Usuario',
      avatar: this.profile?.avatar_url || this.user.user_metadata?.avatar_url || this.getDefaultAvatar(),
      role: this.profile?.role || 'user',
      permissions: this.profile?.permissions || []
    };
  }
  
  getDefaultAvatar() {
    // Generar avatar con iniciales usando API externa
    const name = this.user.email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  }
  
  async logout() {
    await this.supabase.auth.signOut();
    this.redirectToLogin();
  }
  
  redirectToLogin() {
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = '/index.html';
    }
  }
  
  async checkPermissions(requiredPermissions = []) {
    if (!this.profile || !this.profile.permissions) return true; // Si no hay sistema de permisos, permitir
    
    return requiredPermissions.every(perm =>
      this.profile.permissions.includes(perm)
    );
  }
}