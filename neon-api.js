/* Managed Auth REST endpoints; cookies stay HTTP-only and JWTs stay in memory. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.BB_NEON_API = factory(root.BB_NEON, root.fetch.bind(root));
})(typeof window === 'undefined' ? globalThis : window, function (config, fetcher) {
  async function request(url, options) {
    const response = await fetcher(url, { cache: 'no-store', ...options });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to save your collection.' : 'The account service could not complete that request. Check your details and connection.');
    return response.status === 204 ? null : response.json();
  }
  function auth(path, body) {
    return request(config.authUrl + '/' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  }
  async function data(table, query = {}, body) {
    if (!['brush_profiles', 'brush_events'].includes(table)) throw new Error('Unknown account data.');
    const token = await auth('token');
    if (!token?.token) throw new Error('Sign in again to save your collection.');
    return request(config.dataUrl + '/' + table + '?' + new URLSearchParams(query), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + token.token, 'Content-Type': 'application/json', Prefer: body === undefined ? 'return=representation' : 'resolution=ignore-duplicates,return=representation' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  }
  return { auth, data };
});
