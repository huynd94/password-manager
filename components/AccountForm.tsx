
import React, { useState, useEffect } from 'react';
import { Account, AccountType } from '../types';
import { ACCOUNT_TYPE_OPTIONS } from '../constants';
import { EyeIcon, EyeOffIcon } from './Icons';

interface AccountFormProps {
  onSave: (account: Omit<Account, 'id'>) => void;
  onCancel: () => void;
  existingAccount: Account | null;
}

const AccountForm: React.FC<AccountFormProps> = ({ onSave, onCancel, existingAccount }) => {
  const [type, setType] = useState<AccountType>(AccountType.GENERAL);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    if (existingAccount) {
      setType(existingAccount.type);
      setName(existingAccount.name);
      setUsername(existingAccount.username);
      setPassword(existingAccount.password);
      setLoginUrl(existingAccount.loginUrl);
    }
  }, [existingAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) {
        alert('Vui lòng điền đầy đủ Tên, Tên đăng nhập và Mật khẩu.');
        return;
    }
    onSave({ type, name, username, password, loginUrl });
  };
  
  const formTitle = existingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới';

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-white">{formTitle}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="account-type" className="block text-sm font-medium text-gray-400 mb-1">Loại tài khoản</label>
          <select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            {ACCOUNT_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="account-name" className="block text-sm font-medium text-gray-400 mb-1">Tên gợi nhớ</label>
          <input
            id="account-name"
            type="text"
            placeholder="VD: Gmail cá nhân"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-url" className="block text-sm font-medium text-gray-400 mb-1">Link đăng nhập</label>
        <input
          id="login-url"
          type="url"
          placeholder="https://example.com/login"
          value={loginUrl}
          onChange={(e) => setLoginUrl(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>
      
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">Tên đăng nhập / Email</label>
        <input
          id="username"
          type="text"
          placeholder="your.email@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">Mật khẩu</label>
        <div className="relative">
          <input
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            required
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400 transition"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition"
        >
          Lưu
        </button>
      </div>
    </form>
  );
};

export default AccountForm;
