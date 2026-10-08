(function () {
  "use strict";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error(
      "Supabase JS não foi carregado. Verifique se o CDN do @supabase/supabase-js está antes de supabase-client.js."
    );
  }

  if (!window.CONFIG || !window.CONFIG.supabaseUrl || !window.CONFIG.supabaseAnonKey) {
    throw new Error(
      "CONFIG do Supabase não foi carregado corretamente. Verifique config/config.js."
    );
  }

  window.supabaseClient = window.supabase.createClient(
    window.CONFIG.supabaseUrl,
    window.CONFIG.supabaseAnonKey
  );
})();
