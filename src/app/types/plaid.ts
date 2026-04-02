export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string | null;
  };
}

export interface PlaidItem {
  item_id: string;
  institution_name: string;
  accounts: PlaidAccount[];
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string;
  category_detailed: string;
  pending: boolean;
  iso_currency_code: string;
  logo_url: string | null;
}
