/** Store a session in this tab, or persist it when explicitly requested. */
export function getAuthToken(): string | null {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export function authStorage(): Storage {
  return sessionStorage.getItem('token') ? sessionStorage : localStorage;
}

export function clearAuthSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('token');
    storage.removeItem('currentUser');
  }
}

export function saveAuthSession(token: string, user: unknown, remember: boolean) {
  clearAuthSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('currentUser', JSON.stringify(user));
}
