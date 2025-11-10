import { Account } from '../types';

// Trong một ứng dụng thực tế, URL này sẽ là domain của bạn
// Dùng đường dẫn tương đối để chạy chung domain qua reverse proxy
const API_BASE_URL = '/api';

// --- Các hàm mã hóa/giải mã vẫn giữ nguyên ở client ---
// (Bạn có thể sao chép các hàm helper từ hook useEncryptedLocalStorage.ts vào đây)
const SALT = 'a-secure-static-salt-for-demo'; 
const IV_LENGTH = 12;
const KEY_ALGORITHM = 'AES-GCM';

const bufferToBase64 = (buffer: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};
async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: KEY_ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt']);
}
async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedContent = await window.crypto.subtle.encrypt({ name: KEY_ALGORITHM, iv }, key, enc.encode(data));
  const resultBuffer = new Uint8Array(iv.length + new Uint8Array(encryptedContent).length);
  resultBuffer.set(iv);
  resultBuffer.set(new Uint8Array(encryptedContent), iv.length);
  return bufferToBase64(resultBuffer.buffer);
}
async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const encryptedBytes = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = encryptedBytes.slice(0, IV_LENGTH);
  const data = encryptedBytes.slice(IV_LENGTH);
  const decryptedContent = await window.crypto.subtle.decrypt({ name: KEY_ALGORITHM, iv }, key, data);
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}
// --- Hết phần mã hóa ---

const apiService = {
  /**
   * Đăng nhập người dùng và lưu token
   */
  login: async (username: string, masterPassword: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: masterPassword }), // Gửi master password để backend xác thực
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const { token } = await response.json();
    localStorage.setItem('authToken', token);
    return token;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
  },

  /**
   * Lấy và giải mã dữ liệu tài khoản từ server
   */
  fetchAccounts: async (masterPassword: string): Promise<Account[]> => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('Failed to fetch accounts');
    
    const { encrypted_vault } = await response.json();
    
    if (!encrypted_vault) {
      return []; // Nếu vault rỗng, trả về mảng rỗng
    }
    
    // Giải mã ở client
    const cryptoKey = await deriveKey(masterPassword, SALT);
    const decryptedJson = await decryptData(encrypted_vault, cryptoKey);
    return JSON.parse(decryptedJson) as Account[];
  },

  /**
   * Mã hóa và lưu dữ liệu tài khoản lên server
   */
  saveAccounts: async (accounts: Account[], masterPassword: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');

    // Mã hóa ở client
    const cryptoKey = await deriveKey(masterPassword, SALT);
    const accountsJson = JSON.stringify(accounts);
    const encryptedVault = await encryptData(accountsJson, cryptoKey);

    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ encrypted_vault: encryptedVault }),
    });

    if (!response.ok) throw new Error('Failed to save accounts');
  },
};

export default apiService;
