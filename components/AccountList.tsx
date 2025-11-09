import React from 'react';
import { Account } from '../types';
import AccountCard from './AccountCard';
import { ArchiveIcon } from './Icons';

interface AccountListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string) => void;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, onEdit, onDelete, onShowToast }) => {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gray-800/50 rounded-lg">
        <ArchiveIcon className="h-12 w-12 mx-auto text-gray-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-300">Không có tài khoản nào</h3>
        <p className="mt-1 text-sm text-gray-400">Bắt đầu bằng cách thêm một tài khoản mới.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {accounts.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account.id)}
          onShowToast={onShowToast}
        />
      ))}
    </div>
  );
};

export default AccountList;