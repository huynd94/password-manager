import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { CopyIcon, EyeIcon, EyeOffIcon, TrashIcon, EditIcon, GlobeAltIcon, ServerIcon, AtSymbolIcon, ExternalLinkIcon } from './Icons';
import { ACCOUNT_TYPE_OPTIONS } from '../constants';


const AccountTypeIcon: React.FC<{ type: AccountType, className?: string }> = ({ type, className = "h-6 w-6" }) => {
    switch (type) {
        case AccountType.WEBSITE:
            return <GlobeAltIcon className={className} />;
        case AccountType.HOSTING_VPS:
            return <ServerIcon className={className} />;
        case AccountType.GENERAL:
        default:
            return <AtSymbolIcon className={className} />;
    }
};

const AccountCard: React.FC<{ account: Account; onEdit: () => void; onDelete: () => void; onShowToast: (message: string) => void; }> = ({ account, onEdit, onDelete, onShowToast }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleCopy = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    const typeText = type === 'username' ? 'tên đăng nhập' : 'mật khẩu';
    onShowToast(`Đã sao chép ${typeText}!`);
  };
  
  const typeLabel = ACCOUNT_TYPE_OPTIONS.find(opt => opt.value === account.type)?.label || account.type;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-1 hover:ring-indigo-500/50">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-700 p-2 rounded-full">
              <AccountTypeIcon type={account.type} className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{account.name}</h3>
              <p className="text-xs text-gray-400">{typeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition" aria-label="Chỉnh sửa tài khoản"><EditIcon className="h-5 w-5" /></button>
            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-700 transition" aria-label="Xóa tài khoản"><TrashIcon className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Username */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Tên đăng nhập</span>
            <div className="flex items-center gap-2 max-w-[60%]">
              <span className="text-white font-mono text-sm truncate" title={account.username}>{account.username}</span>
              <button onClick={() => handleCopy(account.username, 'username')} className="p-1 text-gray-400 hover:text-white transition" aria-label="Sao chép tên đăng nhập">
                <CopyIcon className="h-4 w-4"/>
              </button>
            </div>
          </div>
          
          {/* Password */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Mật khẩu</span>
            <div className="flex items-center gap-2 max-w-[60%]">
              <span className="text-white font-mono text-sm truncate">
                {isPasswordVisible ? account.password : '••••••••••••'}
              </span>
              <div className="flex items-center">
                 <button onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="p-1 text-gray-400 hover:text-white transition" aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                    {isPasswordVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4"/>}
                </button>
                <button onClick={() => handleCopy(account.password, 'password')} className="p-1 text-gray-400 hover:text-white transition" aria-label="Sao chép mật khẩu">
                  <CopyIcon className="h-4 w-4"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {account.loginUrl && (
        <a 
          href={account.loginUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 text-center transition flex items-center justify-center gap-2"
        >
          <ExternalLinkIcon className="h-5 w-5"/>
          <span>Đến trang đăng nhập</span>
        </a>
      )}
    </div>
  );
};


export default AccountCard;