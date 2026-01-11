
export enum TabType {
  COUNTING = 'counting',
  SUMMARY = 'summary',
  EXPENSES = 'expenses',
  PERSONAL = 'personal',
  REPORT = 'report',
  CALCULATION = 'calculation'
}

export interface ExpenseDetail {
  name: string;
  amount: number;
  type?: 'deposit' | 'withdraw'; // 통장 입출금 구분을 위한 속성
  date?: string; // 기록 날짜 (MM.DD 형식)
}

export interface OfferingData {
  counting: Record<string, Record<string, Record<number, number>>>;
  attendance: Record<string, Record<string, number>>;
  expenses: Record<string, number>;
  expenseDetails: Record<string, ExpenseDetail[]>;
  personalExpenses: Record<string, number>;
  personalExpenseDetails: Record<string, ExpenseDetail[]>;
  bankDeposits?: ExpenseDetail[];
  calcExpenses?: ExpenseDetail[]; 
  manualCash?: number;
  reportExpenseNames: Record<string, string>;
  report2Expenses: Record<string, number>;
  report2Names: Record<string, string>;
  lastUpdated: string;
}

export interface ModalConfig {
  type: 'counting' | 'attendance' | 'rename' | 'add_category' | 'delete_category' | 'detail' | 'reset' | 'save' | 'add_personal_category' | 'delete_personal_category' | 'personal_detail' | 'export_filename' | 'edit_cash' | 'add_bank_deposit' | 'add_calc_expense' | 'delete_detail' | 'delete_bank_record' | 'edit_personal_detail';
  isOpen: boolean;
  day?: string;
  time?: string;
  category?: string;
  oldName?: string;
  detailIndex?: number;
  isPersonal?: boolean;
}
