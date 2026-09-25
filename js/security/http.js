// ============================================
// Http - cliente HTTP para a API REST (Spring Boot)
// Camada Security (equivalente ao pacote Security/ do backend): centraliza:
//  - montagem da URL (CONFIG.apiBaseUrl)
//  - anexação do JWT (Authorization: Bearer ...)
//  - parse de JSON e de erros no formato ErroResponse do backend
//    ({ timestamp, status, erro, campos })
// ============================================

const Http = {
  TOKEN_KEY: 'talentos_token',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  /**
   * @param {string} method GET|POST|PUT|DELETE
   * @param {string} path caminho relativo, ex: '/aluno/perfil'
   * @param {{body?: any, auth?: boolean, isForm?: boolean}} options
   */
  async request(method, path, options = {}) {
    const { body, auth = true, isForm = false } = options;

    const headers = {};
    if (!isForm && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body))
      });
    } catch (networkError) {
      console.error('Erro de rede ao chamar', path, networkError);
      const err = new Error('Não foi possível conectar ao servidor. Verifique se o backend está no ar e se o endereço em CONFIG.apiBaseUrl está correto.');
      err.status = 0;
      throw err;
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok) {
      if (response.status === 401) {
        // Token ausente/expirado/inválido: força novo login
        this.clearToken();
      }

      const message = (data && (data.erro || data.message)) || `Erro ${response.status} ao comunicar com o servidor.`;
      const error = new Error(message);
      error.status = response.status;
      error.campos = data && data.campos ? data.campos : null;
      throw error;
    }

    return data;
  },

  get(path, options) { return this.request('GET', path, options); },
  post(path, body, options = {}) { return this.request('POST', path, { ...options, body }); },
  put(path, body, options = {}) { return this.request('PUT', path, { ...options, body }); },
  del(path, options) { return this.request('DELETE', path, options); },

  // Upload de arquivos (multipart/form-data) - ex: foto de perfil, comprovantes
  postForm(path, formData, options = {}) {
    return this.request('POST', path, { ...options, body: formData, isForm: true });
  }
};
