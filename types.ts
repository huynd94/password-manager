
export enum AccountType {
  GENERAL = 'General',
  WEBSITE = 'Website',
  HOSTING_VPS = 'Hosting/VPS',
}

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  username: string;
  password: string;
  loginUrl: string;
}
