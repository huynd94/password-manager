import React, { useState } from 'react';
import { LockClosedIcon, EyeIcon, EyeOffIcon } from './Icons';

interface LoginProps {
  onLogin: (username: string, masterPassword: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && masterPassword.trim()) {
      onLogin(username, masterPassword);
    } else {
      alert('Vui lòng nhập tên người dùng và mật khẩu chính.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <LockClosedIcon className="h-12 w-12 text-indigo-400" />
            <h1 className="text-3xl font-bold tracking-tight text-white mt-4">Trình quản lý mật khẩu</h1>
            <p className="text-gray-400 mt-2">Đăng nhập để truy cập kho dữ liệu của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">Tên người dùng</label>
            <input
              id="username"
              type="text"
              placeholder="Nhập tên người dùng của bạn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="master-password" className="block text-sm font-medium text-gray-400 mb-1">Mật khẩu chính (Master Password)</label>
             <div className="relative">
                <input
                    id="master-password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
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
          <button
            type="submit"
            className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition"
          >
            Mở khóa
          </button>
        </form>
         <div className="text-center mt-6">
            <p className="text-xs text-yellow-400 bg-yellow-900/20 p-3 rounded-lg">
                <strong>Lưu ý:</strong> Đây là một bản demo. "Tài khoản người dùng" chỉ dùng để phân vùng dữ liệu trong trình duyệt. Chưa có hệ thống backend thực sự.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
