import React, { useState, useMemo, useEffect, useCallback } from 'react';
import apiService from './services/apiService'; // Import the new service
import Login from './components/Login';
import AccountList from './components/AccountList';
import AccountForm from './components/AccountForm';
import { Account, AccountType } from './types';
import { PlusIcon, LockClosedIcon, LogoutIcon, WarningIcon } from './components/Icons';
import { ACCOUNT_TYPE_OPTIONS } from './constants';

const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className={`bg-gray-800 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, children }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 sm:p-8">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
            <WarningIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
            <div className="mt-2"><div className="text-sm text-gray-400">{children}</div></div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
          <button type="button" className="w-full inline-flex justify-center rounded-md shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 sm:w-auto sm:text-sm transition" onClick={onConfirm}>Xác nhận Xóa</button>
          <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </Modal>
  );
};

function App() {
  const [auth, setAuth] = useState({ isLoggedIn: false, username: '', masterPassword: '' });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleLogin = useCallback(async (username: string, masterPassword: string) => {
    setIsLoading(true);
    try {
      await apiService.login(username, masterPassword);
      const fetchedAccounts = await apiService.fetchAccounts(masterPassword);
      setAccounts(fetchedAccounts);
      setAuth({ isLoggedIn: true, username, masterPassword });
    } catch (error) {
      console.error('Login failed:', error);
      alert(error instanceof Error ? error.message : 'Login failed. Please check credentials.');
      apiService.logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    apiService.logout();
    setAuth({ isLoggedIn: false, username: '', masterPassword: '' });
    setAccounts([]);
    setSearchTerm('');
    setFilterType('all');
  };

  const handleSaveAccount = useCallback(async (accountData: Omit<Account, 'id'>) => {
    let updatedAccounts: Account[];
    if (editingAccount) {
      updatedAccounts = accounts.map(acc => acc.id === editingAccount.id ? { ...acc, ...accountData } : acc);
      setToastMessage('Tài khoản đã được cập nhật!');
    } else {
      const newAccount: Account = { id: uuidv4(), ...accountData };
      updatedAccounts = [...accounts, newAccount];
      setToastMessage('Tài khoản đã được thêm!');
    }
    
    setAccounts(updatedAccounts);
    closeModal();

    try {
      await apiService.saveAccounts(updatedAccounts, auth.masterPassword);
    } catch (error) {
      console.error('Failed to save accounts:', error);
      setToastMessage('Lỗi: Không thể lưu dữ liệu!');
      // Optionally revert state on failure
      // setAccounts(accounts);
    }
  }, [accounts, editingAccount, auth.masterPassword]);


  const handleDeleteRequest = (id: string) => {
    const account = accounts.find(acc => acc.id === id);
    if (account) setAccountToDelete(account);
  };

  const confirmDeleteAccount = useCallback(async () => {
    if (accountToDelete) {
      const updatedAccounts = accounts.filter(acc => acc.id !== accountToDelete.id);
      setAccounts(updatedAccounts);
      setToastMessage('Tài khoản đã được xóa!');
      setAccountToDelete(null);

      try {
        await apiService.saveAccounts(updatedAccounts, auth.masterPassword);
      } catch (error) {
        console.error('Failed to save after deletion:', error);
        setToastMessage('Lỗi: Không thể lưu thay đổi!');
      }
    }
  }, [accountToDelete, accounts, auth.masterPassword]);

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };
  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(acc => filterType === 'all' || acc.type === filterType)
      .filter(acc =>
          acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (acc.loginUrl && acc.loginUrl.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [accounts, searchTerm, filterType]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <p className="text-white text-lg">Đang xác thực và tải dữ liệu...</p>
      </div>
    );
  }

  if (!auth.isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toastMessage && (
        <div className="fixed top-5 right-5 bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-lg z-[60]">
          {toastMessage}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AccountForm onSave={handleSaveAccount} onCancel={closeModal} existingAccount={editingAccount} />
      </Modal>

      <ConfirmationModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Xóa tài khoản"
      >
        <p>Bạn có chắc chắn muốn xóa tài khoản <strong>{accountToDelete?.name}</strong>? Hành động này không thể hoàn tác.</p>
      </ConfirmationModal>

      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <LockClosedIcon className="h-8 w-8 text-indigo-400" />
              <h1 className="text-xl font-bold">Trình quản lý mật khẩu</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden sm:block">Đã đăng nhập: <strong>{auth.username}</strong></span>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-600/50 text-red-100 font-semibold rounded-lg hover:bg-red-600 transition" aria-label="Đăng xuất">
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:block">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Kho tài khoản</h2>
            <button onClick={openAddModal} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition">
              <PlusIcon className="h-6 w-6" />
              <span>Thêm tài khoản</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Tìm kiếm theo tên, username, URL..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
            <select value={filterType} onChange={e => setFilterType(e.target.value as AccountType | 'all')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
              <option value="all">Tất cả các loại</option>
              {ACCOUNT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
        <AccountList accounts={filteredAccounts} onEdit={openEditModal} onDelete={handleDeleteRequest} onShowToast={setToastMessage} />
      </main>
    </div>
  );
}

export default App;
