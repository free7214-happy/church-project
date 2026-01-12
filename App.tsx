import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calculator, Receipt, FileText, 
  Save, Trash2, Plus, FolderOpen,
  ChevronRight, X, RotateCcw, CheckCircle2,
  User, Edit3, Landmark, Wallet, ArrowDownRight,
  AlertCircle, ArrowUpRight,
  Users, TrendingUp, Info, Calendar, Download, Printer
} from 'lucide-react';
import { TabType, OfferingData, ModalConfig, ExpenseDetail } from './types';
import { DAYS, TIMES, DENOMINATIONS, INITIAL_EXPENSE_CATEGORIES, STORAGE_KEY } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.COUNTING);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bankType, setBankType] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedPersonalCat, setSelectedPersonalCat] = useState<string>('');
  const [bankAmountDisplay, setBankAmountDisplay] = useState('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  
  const [data, setData] = useState<OfferingData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      counting: {},
      attendance: {},
      expenses: INITIAL_EXPENSE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {}),
      expenseDetails: {},
      personalExpenses: {},
      personalExpenseDetails: {},
      bankDeposits: [],
      calcExpenses: [],
      manualCash: 0,
      reportExpenseNames: {},
      report2Expenses: {},
      report2Names: {},
      lastUpdated: new Date().toISOString()
    };
  });

  const [localReportExpenses, setLocalReportExpenses] = useState<Record<string, number>>({});
  const [isLocalReportInitialized, setIsLocalReportInitialized] = useState(false);
  const [modal, setModal] = useState<ModalConfig>({ type: 'counting', isOpen: false });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (activeTab === TabType.REPORT && !isLocalReportInitialized) {
      setLocalReportExpenses({ ...data.expenses });
      setIsLocalReportInitialized(true);
    }
  }, [activeTab, data.expenses, isLocalReportInitialized]);

  const isTimeValid = (day: string, time: string) => {
    if (day === '주일' && (time === '새벽' || time === '낮')) return false;
    return true;
  };

  const getCountingTotal = (day: string, time: string) => {
    if (!isTimeValid(day, time)) return 0;
    const entry = data.counting[day]?.[time] || {};
    return Object.entries(entry).reduce((sum, [denom, qty]) => sum + (Number(denom) * (qty as number)), 0);
  };

  const getDayTotalIncome = (day: string) => TIMES.reduce((sum, time) => sum + getCountingTotal(day, time), 0);
  const getAttendanceTotal = (day: string, time: string) => Number(data.attendance[day]?.[time] || 0);
  const getDayTotalAttendance = (day: string) => TIMES.reduce((sum, time) => sum + Number(getAttendanceTotal(day, time)), 0);

  const totalAccumulatedOffering = DAYS.reduce((sum: number, day: string) => sum + Number(getDayTotalIncome(day)), 0);
  const totalAttendanceAll = DAYS.reduce((sum: number, day: string) => {
    const dayAttendance = Object.values(data.attendance[day] || {}).reduce((acc: number, val: unknown) => acc + (Number(val) || 0), 0);
    return sum + dayAttendance;
  }, 0);
  const totalExpenses = Object.values(data.expenses).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  
  const totalPersonalExpenses = Object.values(data.personalExpenses || {}).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  const totalBankNet = (data.bankDeposits || []).reduce((sum, item) => item.type === 'withdraw' ? sum - item.amount : sum + item.amount, 0);
  const manualCashTotal = Object.entries(data.counting['__manual__']?.['__cash__'] || {}).reduce((sum: number, [d, q]: [string, unknown]) => sum + (Number(d) * (Number(q) || 0)), 0);
  const physicalCashTotal = manualCashTotal + totalBankNet;
  const currentNetBalance = Number(totalAccumulatedOffering) - Number(totalExpenses);
  const settlingDifference = physicalCashTotal - currentNetBalance;

  const localReportTotalExpenses = useMemo(() => {
    return Object.values(localReportExpenses).reduce((sum, val) => sum + (val || 0), 0);
  }, [localReportExpenses]);

  const handleUpdateCounting = (day: string, time: string, denom: number, value: string) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setData(prev => {
      const next = { ...prev };
      if (!next.counting[day]) next.counting[day] = {};
      if (!next.counting[day][time]) next.counting[day][time] = {};
      next.counting[day][time][denom] = qty;
      return { ...next, lastUpdated: new Date().toISOString() };
    });
  };

  const handleUpdateAttendance = (day: string, time: string, value: string) => {
    const count = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    setData(prev => {
      const next = { ...prev };
      if (!next.attendance[day]) next.attendance[day] = {};
      next.attendance[day][time] = count;
      return { ...next, lastUpdated: new Date().toISOString() };
    });
  };

  const handleUpdateManualCash = (denom: number, value: string) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setData(prev => {
      const next = { ...prev };
      if (!next.counting['__manual__']) next.counting['__manual__'] = {};
      if (!next.counting['__manual__']['__cash__']) next.counting['__manual__']['__cash__'] = {};
      next.counting['__manual__']['__cash__'][denom] = qty;
      const newTotal = Object.entries(next.counting['__manual__']['__cash__']).reduce((sum, [d, q]) => sum + (Number(d) * (Number(q) || 0)), 0);
      return { ...next, manualCash: newTotal, lastUpdated: new Date().toISOString() };
    });
  };

  const handleAddBankRecord = (name: string, amount: number, type: 'deposit' | 'withdraw', personalCat?: string) => {
    let finalName = name;
    let finalAmount = amount;
    if (type === 'withdraw' && personalCat) {
      finalName = personalCat;
      finalAmount = data.personalExpenses[personalCat] || 0;
    }
    if (!finalName.trim()) return;

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    setData(prev => {
      const next = { ...prev };
      next.bankDeposits = [...(prev.bankDeposits || []), { name: finalName, amount: finalAmount, type, date: dateStr }];
      if (type === 'withdraw' && personalCat && prev.personalExpenses[personalCat] !== undefined) {
        const currentDetails = prev.personalExpenseDetails[personalCat] || [];
        const alreadyHasWithdraw = currentDetails.some(d => d.name === '[통장출금완료]');
        if (!alreadyHasWithdraw) {
          next.personalExpenseDetails = { 
            ...prev.personalExpenseDetails, 
            [personalCat]: [...currentDetails, { name: '[통장출금완료]', amount: 0, date: dateStr }] 
          };
        }
      }
      return { ...next, lastUpdated: new Date().toISOString() };
    });
    setModal({ ...modal, isOpen: false });
    setSelectedPersonalCat('');
    setBankType('deposit');
    setBankAmountDisplay('');
  };

  const removeBankRecord = (index: number) => {
    setData(prev => {
      const newList = [...(prev.bankDeposits || [])];
      newList.splice(index, 1);
      return { ...prev, bankDeposits: newList, lastUpdated: new Date().toISOString() };
    });
    setModal({ ...modal, isOpen: false });
  };

  const handleAddCategory = (name: string, isPersonal: boolean = false) => {
    if (!name.trim()) return;
    setData(prev => {
      const key = isPersonal ? 'personalExpenses' : 'expenses';
      if (prev[key][name] !== undefined) return prev;
      return { ...prev, [key]: { ...prev[key], [name]: 0 }, lastUpdated: new Date().toISOString() };
    });
    setModal({ ...modal, isOpen: false });
  };

  const handleDeleteCategory = (cat: string, isPersonal: boolean = false) => {
    setData(prev => {
      const expKey = isPersonal ? 'personalExpenses' : 'expenses';
      const detKey = isPersonal ? 'personalExpenseDetails' : 'expenseDetails';
      const newExpenses = { ...prev[expKey] };
      const newDetails = { ...prev[detKey] };
      delete newExpenses[cat];
      delete newDetails[cat];
      return { ...prev, [expKey]: newExpenses, [detKey]: newDetails, lastUpdated: new Date().toISOString() };
    });
    setModal({ ...modal, isOpen: false });
  };

  const handleRenameCategory = (oldName: string, newName: string, isPersonal: boolean = false) => {
    if (!newName.trim() || oldName === newName) return;
    setData(prev => {
      const expKey = isPersonal ? 'personalExpenses' : 'expenses';
      const detKey = isPersonal ? 'personalExpenseDetails' : 'expenseDetails';
      
      const newExpenses: Record<string, number> = {};
      Object.keys(prev[expKey]).forEach(key => {
        if (key === oldName) {
          newExpenses[newName] = prev[expKey][oldName];
        } else {
          newExpenses[key] = prev[expKey][key];
        }
      });

      const newDetails: Record<string, ExpenseDetail[]> = {};
      Object.keys(prev[detKey]).forEach(key => {
        if (key === oldName) {
          newDetails[newName] = prev[detKey][oldName] || [];
        } else {
          newDetails[key] = prev[detKey][key];
        }
      });

      return { 
        ...prev, 
        [expKey]: newExpenses, 
        [detKey]: newDetails, 
        lastUpdated: new Date().toISOString() 
      };
    });
    setModal({ ...modal, isOpen: false });
  };

  const handleUpdateDetail = (cat: string, name: string, amount: number, isPersonal: boolean = false, syncWithChurchCat?: string) => {
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    setData(prev => {
      const expKey = isPersonal ? 'personalExpenses' : 'expenses';
      const detKey = isPersonal ? 'personalExpenseDetails' : 'expenseDetails';
      const currentDetails = prev[detKey][cat] || [];
      const newDetails = [...currentDetails, { name, amount: Math.max(0, amount), date: dateStr }];
      const newTotal = newDetails.reduce((s, i) => s + i.amount, 0);
      let nextData = { 
        ...prev, 
        [detKey]: { ...prev[detKey], [cat]: newDetails }, 
        [expKey]: { ...prev[expKey], [cat]: newTotal } 
      };
      if (isPersonal && syncWithChurchCat && prev.expenses[syncWithChurchCat] !== undefined) {
        const churchDetails = [...(prev.expenseDetails[syncWithChurchCat] || []), { name, amount: Math.max(0, amount), date: dateStr }];
        const churchTotal = churchDetails.reduce((s, i) => s + i.amount, 0);
        nextData = { 
          ...nextData, 
          expenseDetails: { ...nextData.expenseDetails, [syncWithChurchCat]: churchDetails }, 
          expenses: { ...nextData.expenses, [syncWithChurchCat]: churchTotal } 
        };
      }
      return { ...nextData, lastUpdated: new Date().toISOString() };
    });
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleEditPersonalDetail = (cat: string, index: number, name: string, amount: number, syncWithChurchCat?: string) => {
    setData(prev => {
      const details = [...(prev.personalExpenseDetails[cat] || [])];
      details[index] = { ...details[index], name, amount: Math.max(0, amount) };
      const newTotal = details.reduce((s, i) => s + i.amount, 0);
      
      let nextData = { 
        ...prev, 
        personalExpenseDetails: { ...prev.personalExpenseDetails, [cat]: details }, 
        personalExpenses: { ...prev.personalExpenses, [cat]: newTotal },
        lastUpdated: new Date().toISOString()
      };

      if (syncWithChurchCat && prev.expenses[syncWithChurchCat] !== undefined) {
        const dateStr = details[index].date || `${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`;
        const churchDetails = [...(prev.expenseDetails[syncWithChurchCat] || []), { name, amount: Math.max(0, amount), date: dateStr }];
        const churchTotal = churchDetails.reduce((s, i) => s + i.amount, 0);
        nextData = { 
          ...nextData, 
          expenseDetails: { ...nextData.expenseDetails, [syncWithChurchCat]: churchDetails }, 
          expenses: { ...nextData.expenses, [syncWithChurchCat]: churchTotal } 
        };
      }

      return nextData;
    });
    setModal({ ...modal, isOpen: false });
  };

  const handleRemoveDetail = (cat: string, index: number, isPersonal: boolean = false) => {
    setData(prev => {
      const expKey = isPersonal ? 'personalExpenses' : 'expenses';
      const detKey = isPersonal ? 'personalExpenseDetails' : 'expenseDetails';
      const details = [...(prev[detKey][cat] || [])];
      details.splice(index, 1);
      const total = details.reduce((s, i) => s + i.amount, 0);
      return { 
        ...prev, 
        [detKey]: { ...prev[detKey], [cat]: details }, 
        [expKey]: { ...prev[expKey], [cat]: total },
        lastUpdated: new Date().toISOString()
      };
    });
    setModal({ ...modal, isOpen: false });
  };

  const resetAllData = () => {
    setData({
      counting: {}, attendance: {}, expenses: INITIAL_EXPENSE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {}),
      expenseDetails: {}, personalExpenses: {}, personalExpenseDetails: {}, bankDeposits: [], calcExpenses: [], manualCash: 0,
      reportExpenseNames: {}, report2Expenses: {}, report2Names: {}, lastUpdated: new Date().toISOString()
    });
    setLocalReportExpenses({});
    setIsLocalReportInitialized(false);
    setCurrentFileName('');
    setModal({ type: 'reset', isOpen: false });
  };

  const executeDownload = (filename: string) => {
    const finalFilename = filename.trim() || `church_finance_${new Date().toISOString().split('T')[0]}`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename.endsWith('.json') ? finalFilename : `${finalFilename}.json`;
    link.click();
    setCurrentFileName(finalFilename.replace('.json', ''));
    setModal({ ...modal, isOpen: false });
  };

  const getReportExpenses = () => {
    const expenses = { ...data.expenses };
    const result: Array<{cat: string, val: number}> = [];
    
    if (expenses['강사사례'] !== undefined) {
      result.push({ cat: '강사사례', val: Number(expenses['강사사례']) || 0 });
    }
    
    Object.entries(expenses).forEach(([cat, val]) => {
      if (cat === '강사사례') return;
      result.push({ cat, val: val as number });
    });
    return result;
  };

  const getTabLabel = (tab: TabType) => {
    switch(tab) {
      case TabType.COUNTING: return '헌금계수';
      case TabType.SUMMARY: return '참석인원';
      case TabType.EXPENSES: return '지출관리';
      case TabType.PERSONAL: return '개인지출';
      case TabType.REPORT: return '결산보고';
      case TabType.CALCULATION: return '정산대조';
      default: return '';
    }
  };

  const handleLocalReportEdit = (cat: string, value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    const val = parseInt(numeric) || 0;
    setLocalReportExpenses(prev => ({ ...prev, [cat]: val }));
  };

  const handlePrintTarget = (id: string) => {
    const content = document.getElementById(id);
    if (!content) return;
    
    // Create a temporary iframe for clean printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.write(`
      <html>
        <head>
          <title>재정결산보고서</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              font-family: 'Pretendard', sans-serif; 
              margin: 0;
              padding: 0;
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              display: flex;
              align-items: center;
              justify-content: center;
              width: 210mm;
              min-height: 297mm;
            }
            .print-container {
              width: 100%;
              max-width: 190mm;
              padding: 20mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${content.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
              setTimeout(() => { window.frameElement.remove(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#fffbf2] text-stone-700 relative">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 p-5 flex justify-between items-center no-print shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-stone-800 uppercase">연합성회 재정관리</h1>
          <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Church Finance Manager</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-orange-50 text-amber-600 rounded-full transition-colors active:bg-orange-100"><FolderOpen size={20} /></button>
          <button onClick={() => setModal({ type: 'save', isOpen: true })} className="p-2.5 bg-orange-50 text-rose-400 rounded-full transition-colors active:bg-orange-100"><Save size={20} /></button>
          <button onClick={() => setModal({ type: 'reset', isOpen: true })} className="p-2.5 bg-rose-50 text-rose-400 rounded-full transition-colors active:bg-rose-100"><Trash2 size={20} /></button>
        </div>
      </header>
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            setData(json);
            setIsLocalReportInitialized(false);
            setCurrentFileName(file.name.replace('.json', ''));
          } catch (err) { alert("파일 오류"); }
        };
        reader.readAsText(file);
      }} accept=".json" className="hidden" />

      <main className="flex-1 pb-32 pt-4 px-4 overflow-y-auto">
        {activeTab === TabType.COUNTING && (
          <div className="space-y-3">
            <div className="bg-rose-400 rounded-2xl p-6 text-white shadow-lg text-center transform transition-all">
              <span className="text-[15px] opacity-100 font-black uppercase tracking-widest block mb-1">누적 헌금 총액</span>
              <div className="text-4xl font-black tracking-tighter">₩{totalAccumulatedOffering.toLocaleString()}</div>
            </div>
            {DAYS.map(day => (
              <div key={day} className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <h3 className={`text-base font-black w-20 ${day === '주일' ? 'text-rose-500' : 'text-stone-700'}`}>{day}</h3>
                  <div className="flex-1 text-right">
                    <span className="text-xl font-black text-rose-500">₩{getDayTotalIncome(day).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {TIMES.map(time => {
                    if (!isTimeValid(day, time)) return null;
                    const timeTotal = getCountingTotal(day, time);
                    return (
                      <div key={time} className="flex items-center py-2 border-t border-stone-50 first:border-t-0">
                        <span className="text-[13px] font-bold text-stone-600 w-20">{time}</span>
                        <div className="flex-1 text-right">
                          <button onClick={() => setModal({ type: 'counting', isOpen: true, day, time })} className={`font-black text-[13px] transition-all inline-flex items-center active:scale-95 ${timeTotal > 0 ? 'text-stone-600' : 'text-stone-300'}`}>
                            ₩{timeTotal.toLocaleString()}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === TabType.SUMMARY && (
          <div className="space-y-3">
            <div className="bg-amber-400 rounded-2xl p-6 text-white shadow-lg text-center transform transition-all">
              <span className="text-[15px] opacity-100 font-black uppercase tracking-widest block mb-1">누적 참석 인원</span>
              <div className="text-4xl font-black tracking-tighter">{totalAttendanceAll.toLocaleString()}명</div>
            </div>
            {DAYS.map(day => (
              <div key={day} className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <h3 className={`text-base font-black w-20 ${day === '주일' ? 'text-rose-500' : 'text-stone-700'}`}>{day}</h3>
                  <div className="flex-1 text-right">
                    <span className="text-xl font-black text-amber-400">{getDayTotalAttendance(day).toLocaleString()}명</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {TIMES.map(time => {
                    if (!isTimeValid(day, time)) return null;
                    const attendanceVal = Number(data.attendance[day]?.[time] || 0);
                    return (
                      <div key={time} className="flex items-center py-2 border-t border-stone-50 first:border-t-0">
                        <span className="text-[13px] font-bold text-stone-600 w-20">{time}</span>
                        <div className="flex-1 text-right">
                          <div className="inline-flex items-center justify-end w-full">
                            <input 
                              type="number"
                              inputMode="numeric"
                              value={data.attendance[day]?.[time] || ''}
                              onChange={(e) => handleUpdateAttendance(day, time, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              placeholder="0"
                              className={`w-14 bg-transparent border-none font-black text-right outline-none p-0 transition-colors text-[13px] ${attendanceVal > 0 ? 'text-stone-600' : 'text-stone-300 placeholder:text-stone-300'} focus:text-stone-600`}
                            />
                            <span className={`text-[13px] font-black transition-all inline-flex items-center ${attendanceVal > 0 ? 'text-stone-600' : 'text-stone-300'}`}>
                              명
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === TabType.EXPENSES && (
          <div className="space-y-4">
            <div className="bg-stone-700 rounded-3xl p-6 text-white shadow-lg text-center transform transition-all">
              <span className="text-[15px] opacity-100 font-black uppercase tracking-widest text-stone-300 block mb-1">총 지출</span>
              <div className="text-4xl font-black tracking-tighter">₩{totalExpenses.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              {Object.entries(data.expenses).map(([cat, val]) => (
                <div key={cat} className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-base font-black text-stone-700">{cat}</span>
                         <button onClick={() => setModal({ type: 'rename', isOpen: true, oldName: cat, category: cat, isPersonal: false })} className="p-1 text-stone-200 active:text-amber-400"><Edit3 size={14} /></button>
                         <button onClick={() => setModal({ type: 'delete_category', isOpen: true, category: cat, isPersonal: false })} className="p-1 text-stone-200 active:text-rose-400"><Trash2 size={14} /></button>
                      </div>
                      <span className="text-[13px] font-bold text-rose-400">₩{(val || 0).toLocaleString()}</span>
                    </div>
                    <button onClick={() => setModal({ type: 'detail', isOpen: true, category: cat })} className="p-2 bg-rose-50 text-rose-400 rounded-xl active:bg-rose-100"><Plus size={20} /></button>
                  </div>
                  {data.expenseDetails[cat]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-50 space-y-2">
                      {data.expenseDetails[cat].map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[13px] text-stone-600 items-center group">
                          <span className="flex-1 flex items-center gap-1.5 font-bold">
                            <span className="text-stone-300 text-lg">•</span> {item.name}
                          </span>
                          <span className="font-mono text-stone-600 font-bold mr-2">₩{item.amount.toLocaleString()}</span>
                          <button onClick={() => setModal({ type: 'delete_detail', isOpen: true, category: cat, detailIndex: idx, isPersonal: false })} className="text-stone-300 text-xl font-bold hover:text-rose-400 transition-colors p-1 leading-none active:scale-125">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setModal({ type: 'add_category', isOpen: true })} className="w-full p-6 border-2 border-dashed border-orange-100 rounded-3xl text-stone-400 font-bold text-sm mt-4 active:bg-orange-50 transition-colors shadow-sm bg-white/50">+ 항목 추가</button>
            </div>
          </div>
        )}

        {activeTab === TabType.PERSONAL && (
          <div className="space-y-4">
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg text-center transform transition-all">
              <span className="text-[15px] opacity-100 font-black uppercase tracking-widest text-indigo-100 block mb-1">총 개인 지출</span>
              <div className="text-4xl font-black tracking-tighter">₩{totalPersonalExpenses.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              {Object.entries(data.personalExpenses || {}).map(([cat, val]) => (
                <div key={cat} className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-base font-black text-stone-700">{cat}</span>
                         <button onClick={() => setModal({ type: 'rename', isOpen: true, oldName: cat, category: cat, isPersonal: true })} className="p-1 text-stone-200 active:text-amber-400"><Edit3 size={14} /></button>
                         <button onClick={() => setModal({ type: 'delete_personal_category', isOpen: true, category: cat })} className="p-1 text-stone-200 active:text-rose-400"><Trash2 size={14} /></button>
                      </div>
                      <span className="text-[13px] font-bold text-indigo-500">₩{(val || 0).toLocaleString()}</span>
                    </div>
                    <button onClick={() => setModal({ type: 'personal_detail', isOpen: true, category: cat })} className="p-2 bg-indigo-50 text-indigo-500 rounded-xl active:bg-indigo-100"><Plus size={20} /></button>
                  </div>
                  {data.personalExpenseDetails[cat]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-indigo-50 space-y-2">
                      {data.personalExpenseDetails[cat].map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[13px] text-stone-600 items-center group">
                          <span className="flex-1 flex items-center gap-1.5 font-bold">
                            <span className="text-[11px] text-indigo-300 font-mono font-black">{item.date}</span>
                            <span className="text-stone-300 text-lg">•</span> {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-stone-600 font-bold">₩{item.amount.toLocaleString()}</span>
                            <div className="flex items-center">
                               <button onClick={() => setModal({ type: 'edit_personal_detail', isOpen: true, category: cat, detailIndex: idx, isPersonal: true })} className="text-indigo-300 hover:text-indigo-500 p-1 active:scale-125 transition-all"><Edit3 size={14} /></button>
                               <button onClick={() => setModal({ type: 'delete_detail', isOpen: true, category: cat, detailIndex: idx, isPersonal: true })} className="text-stone-300 hover:text-indigo-400 p-1 active:scale-125 transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setModal({ type: 'add_personal_category', isOpen: true })} className="w-full p-6 border-2 border-dashed border-orange-100 rounded-3xl text-stone-400 font-bold text-sm mt-4 active:bg-orange-50 transition-colors shadow-sm bg-white/50">+ 항목 추가</button>
            </div>
          </div>
        )}

        {activeTab === TabType.REPORT && (
          <div className="space-y-12">
            {/* 1. Original Report Table */}
            <div className="space-y-4">
              <div id="report-original" className="bg-white p-6 sm:p-10 border border-orange-100 rounded-3xl shadow-sm text-[12px] min-w-[320px]">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-stone-800">연합성회 재정결산서</h2>
                  <p className="text-stone-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Financial Settlement Report</p>
                </div>
                <div className="border-t-2 border-stone-800">
                  <div className="border-b border-stone-300">
                    <div className="bg-stone-50 p-2 border-b border-stone-300 text-center font-black text-stone-800 uppercase">수입 (Income)</div>
                    <div className="p-6 flex flex-col justify-center items-center text-center">
                      <span className="text-stone-400 font-bold mb-1">총 헌금 수입 합계</span>
                      <span className="text-2xl font-black text-rose-500">₩{totalAccumulatedOffering.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="bg-stone-50 p-2 border-b border-stone-300 text-center font-black text-stone-800 uppercase">지출 (Expense)</div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50">
                          <th className="border-b border-stone-200 p-2 text-left font-bold text-stone-600 w-2/3">항목</th>
                          <th className="border-b border-stone-200 p-2 text-right font-bold text-stone-600">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getReportExpenses().map((item, i) => (
                          <tr key={i} className="border-b border-stone-100 last:border-b-0">
                            <td className="p-2 font-bold text-stone-700">{item.cat}</td>
                            <td className="p-2 text-right font-medium text-stone-600">₩{item.val.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-0 border-t-2 border-stone-800">
                  <div className="grid grid-cols-2 divide-x divide-stone-300 bg-stone-50">
                    <div className="p-4 flex flex-col items-center">
                      <span className="text-stone-400 font-bold text-[10px] uppercase mb-1">수입 총계</span>
                      <span className="font-black text-rose-500 text-base">₩{totalAccumulatedOffering.toLocaleString()}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                      <span className="text-stone-400 font-bold text-[10px] uppercase mb-1">지출 총계</span>
                      <span className="font-black text-stone-800 text-base">₩{totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-stone-800 text-white p-4 flex justify-between items-center rounded-b-xl">
                    <span className="font-black text-sm uppercase tracking-wider">최종 잔액</span>
                    <span className="font-black text-xl">₩{currentNetBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handlePrintTarget('report-original')}
                className="w-full py-3 bg-white border border-stone-200 text-stone-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors active:scale-95 no-print shadow-sm"
              >
                <Printer size={16} />
                <span className="text-xs uppercase tracking-tight">원본 결산서 PDF 내보내기</span>
              </button>
            </div>

            {/* 2. Editable Report Table */}
            <div className="space-y-4">
              <div id="report-editable" className="bg-white p-6 sm:p-10 border-4 border-indigo-100 rounded-3xl shadow-xl text-[12px] relative">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-stone-800">연합성회 재정결산서</h2>
                  <p className="text-stone-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Independent Editable Report</p>
                </div>
                <div className="border-t-2 border-stone-800">
                  <div className="border-b border-stone-300">
                    <div className="bg-indigo-50 p-2 border-b border-stone-300 text-center font-black text-indigo-900 uppercase">수입 (Income)</div>
                    <div className="p-6 flex flex-col justify-center items-center text-center">
                      <span className="text-stone-400 font-bold mb-1">총 헌금 수입 합계</span>
                      <div className="text-2xl font-black text-indigo-600">₩{totalAccumulatedOffering.toLocaleString()}</div>
                      <p className="text-[10px] text-stone-300 mt-1 no-print">* 수입은 원본 데이터를 참조만 합니다.</p>
                    </div>
                  </div>
                  <div>
                    <div className="bg-rose-50 p-2 border-b border-stone-300 text-center font-black text-rose-900 uppercase">지출 (Expense)</div>
                    <div className="p-2 bg-amber-50/50 text-amber-600 text-[10px] text-center font-bold no-print">* 여기서 수정하는 금액은 어떤 탭에도 영향을 주지 않습니다.</div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50">
                          <th className="border-b border-stone-200 p-2 text-left font-bold text-stone-600 w-2/3">항목</th>
                          <th className="border-b border-stone-200 p-2 text-right font-bold text-stone-600">금액 (원)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(data.expenses).map((cat) => (
                          <tr key={cat} className="border-b border-stone-100 last:border-b-0">
                            <td className="p-2 text-stone-700 font-bold">{cat}</td>
                            <td className="p-0 text-right">
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={(localReportExpenses[cat] !== undefined ? localReportExpenses[cat] : (data.expenses[cat] || 0)).toLocaleString()}
                                onChange={(e) => handleLocalReportEdit(cat, e.target.value)}
                                className="w-full bg-transparent text-right font-medium text-stone-600 outline-none px-2 py-2 border-none transition-colors focus:bg-rose-50/50 focus:text-rose-600"
                                onFocus={(e) => e.target.select()}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-0 border-t-2 border-stone-800">
                  <div className="grid grid-cols-2 divide-x divide-stone-300 bg-stone-50">
                    <div className="p-4 flex flex-col items-center">
                      <span className="text-stone-400 font-bold text-[10px] uppercase mb-1">수입 총계</span>
                      <span className="font-black text-indigo-600 text-base">₩{totalAccumulatedOffering.toLocaleString()}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                      <span className="text-stone-400 font-bold text-[10px] uppercase mb-1">지출 총계</span>
                      <span className="font-black text-stone-800 text-base">₩{localReportTotalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-wider">최종 잔액</span>
                    <span className="font-black text-xl text-amber-300">₩{(totalAccumulatedOffering - localReportTotalExpenses).toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-stone-100 flex justify-center border-t border-stone-200 rounded-b-xl no-print">
                    <button 
                      onClick={() => {
                        setLocalReportExpenses({ ...data.expenses });
                        setIsLocalReportInitialized(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl font-black text-[11px] shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                    >
                      <RotateCcw size={14} />
                      원본 데이터 초기화
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handlePrintTarget('report-editable')}
                className="w-full py-3 bg-white border border-stone-200 text-indigo-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors active:scale-95 no-print shadow-sm"
              >
                <Printer size={16} />
                <span className="text-xs uppercase tracking-tight">편집용 결산서 PDF 내보내기</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === TabType.CALCULATION && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border shadow-sm transition-all ${Math.abs(settlingDifference) < 10 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-stone-800">정산 대조</h3>
                  <p className="text-xs font-bold text-stone-500 mt-0.5">장부 잔액 vs 실제 보유 자산</p>
                </div>
                {Math.abs(settlingDifference) < 10 ? (
                  <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full animate-bounce">SETTLED</div>
                ) : (
                  <div className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full">UNBALANCED</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">장부상 잔액 (A)</span>
                  <div className="text-lg font-black text-stone-700">₩{currentNetBalance.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">실제 자산 (B)</span>
                  <div className="text-lg font-black text-stone-700">₩{physicalCashTotal.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-stone-200/50 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-600">차액 (B - A)</span>
                <span className={`text-xl font-black ${settlingDifference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {settlingDifference > 0 ? '+' : ''}₩{settlingDifference.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><TrendingUp size={18} /></div>
                <h3 className="text-lg font-black text-stone-800">장부 기록 현황 (원본)</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                  <span className="text-sm font-bold text-stone-500">누적 수입 (헌금)</span>
                  <span className="font-black text-emerald-600">+ ₩{totalAccumulatedOffering.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                  <span className="text-sm font-bold text-stone-500">누적 지출 (원본)</span>
                  <span className="font-black text-rose-400">- ₩{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-stone-50 px-3 rounded-xl mt-2">
                  <span className="text-sm font-black text-stone-600">장부상 최종 잔액</span>
                  <span className="font-black text-stone-800">₩{currentNetBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500"><Wallet size={18} /></div>
                <h3 className="text-lg font-black text-stone-800">실제 자산 보유 내역</h3>
              </div>
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <Calculator size={14} className="text-stone-400" />
                      <span className="text-xs font-black text-stone-400 uppercase tracking-widest">수기 현금 계수</span>
                    </div>
                    <button onClick={() => setModal({ type: 'edit_cash', isOpen: true })} className="text-xs font-black text-rose-500 underline underline-offset-4">수정</button>
                  </div>
                  <div className="p-4 bg-orange-50/30 border border-orange-100/50 rounded-2xl flex justify-between items-center">
                    <span className="text-sm font-bold text-stone-600">현금 총액</span>
                    <span className="text-lg font-black text-stone-800">₩{manualCashTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <Landmark size={14} className="text-stone-400" />
                      <span className="text-xs font-black text-stone-400 uppercase tracking-widest">통장 입출금 내역</span>
                    </div>
                    <button onClick={() => setModal({ type: 'add_bank_deposit', isOpen: true })} className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg active:bg-indigo-100 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {data.bankDeposits && data.bankDeposits.length > 0 ? (
                      data.bankDeposits.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl group relative overflow-hidden">
                          <div className="flex items-center gap-3 relative z-10">
                            <div className={`p-1.5 rounded-lg ${item.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                              {item.type === 'deposit' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-stone-700 leading-tight">{item.name}</span>
                              <span className="text-[10px] font-mono text-stone-300 font-bold uppercase tracking-tighter">{item.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 relative z-10">
                            <span className={`text-[13px] font-black ${item.type === 'withdraw' ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {item.type === 'withdraw' ? '-' : '+'}₩{item.amount.toLocaleString()}
                            </span>
                            <button onClick={() => setModal({ type: 'delete_bank_record', isOpen: true, detailIndex: idx, category: item.name })} className="text-stone-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1 active:scale-125 transition-all">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-stone-300 text-xs font-bold bg-stone-50/50 rounded-2xl border border-dashed border-stone-100">
                        기록된 통장 내역이 없습니다.
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl flex justify-between items-center mt-4">
                    <span className="text-sm font-bold text-stone-600">통장 순잔액</span>
                    <span className="text-lg font-black text-indigo-600">
                      {totalBankNet >= 0 ? '+' : ''}₩{totalBankNet.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-stone-100 flex justify-between items-center">
                  <span className="text-sm font-black text-stone-800">최종 실제 자산 합계</span>
                  <span className="text-xl font-black text-rose-500">₩{physicalCashTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-orange-100 px-3 py-3 flex justify-around items-center no-print shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-40 max-w-md mx-auto">
        {(Object.values(TabType) as TabType[]).map(tab => {
          const isActive = activeTab === tab;
          const isPersonalTab = tab === TabType.PERSONAL;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} className="flex flex-col items-center gap-1 transition-all duration-300">
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? (isPersonalTab ? 'bg-indigo-50' : 'bg-rose-50') : 'active:bg-stone-50'}`}>
                {tab === TabType.COUNTING && <Calculator size={20} className={isActive ? 'text-rose-500' : 'text-stone-800'} />}
                {tab === TabType.SUMMARY && <Users size={20} className={isActive ? 'text-rose-500' : 'text-stone-800'} />}
                {tab === TabType.EXPENSES && <Receipt size={20} className={isActive ? 'text-rose-500' : 'text-stone-800'} />}
                {tab === TabType.PERSONAL && <User size={20} className={isActive ? 'text-indigo-500' : 'text-stone-800'} />}
                {tab === TabType.REPORT && <FileText size={20} className={isActive ? 'text-rose-500' : 'text-stone-800'} />}
                {tab === TabType.CALCULATION && <Landmark size={20} className={isActive ? 'text-rose-500' : 'text-stone-800'} />}
              </div>
              <span className={`text-[10px] font-black tracking-tighter transition-colors ${isActive ? (isPersonalTab ? 'text-indigo-600' : 'text-rose-600') : 'text-stone-800'}`}>
                {getTabLabel(tab)}
              </span>
            </button>
          );
        })}
      </nav>

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {modal.type === 'save' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-800">데이터 저장</h3>
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">저장 메뉴 선택</p>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => currentFileName ? executeDownload(currentFileName) : setModal({ ...modal, type: 'export_filename' })}
                    className="w-full p-5 bg-stone-50 border border-stone-100 rounded-2xl flex items-center gap-4 active:bg-orange-50 transition-colors group"
                  >
                    <div className="p-3 bg-white rounded-xl shadow-sm text-stone-400 group-active:text-rose-500"><Save size={24} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-stone-800">현재 파일에 저장</p>
                      <p className="text-[10px] font-bold text-stone-400">{currentFileName ? `${currentFileName}.json` : '불러온 파일 없음 (신규 저장)'}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setModal({ ...modal, type: 'export_filename' })}
                    className="w-full p-5 bg-stone-50 border border-stone-100 rounded-2xl flex items-center gap-4 active:bg-orange-50 transition-colors group"
                  >
                    <div className="p-3 bg-white rounded-xl shadow-sm text-stone-400 group-active:text-amber-500"><Download size={24} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-stone-800">다른 이름으로 저장</p>
                      <p className="text-[10px] font-bold text-stone-400">새 파일명으로 내보내기</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {modal.type === 'export_filename' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-stone-800">다른 이름으로 저장</h3>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full"><X size={20} /></button>
                </div>
                <input 
                  id="filenameInput" 
                  type="text" 
                  className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold mb-4 outline-none focus:border-rose-400" 
                  placeholder="파일 이름" 
                  defaultValue={currentFileName || `church_finance_${new Date().toISOString().split('T')[0]}`} 
                  autoFocus 
                />
                <button 
                  onClick={() => {
                    const filename = (document.getElementById('filenameInput') as HTMLInputElement).value;
                    executeDownload(filename);
                  }} 
                  className="w-full py-4 bg-rose-400 text-white font-black rounded-2xl shadow-lg shadow-rose-100 active:scale-95 transition-transform"
                >
                  내보내기 실행
                </button>
              </div>
            )}

            {(modal.type === 'detail' || modal.type === 'personal_detail') && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-800">{modal.category}</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${modal.type === 'personal_detail' ? 'text-indigo-400' : 'text-rose-400'}`}>내역 추가</p>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full active:bg-stone-100 transition-colors"><X size={20} /></button>
                </div>
                <DetailForm 
                  onAdd={(name, amt, syncCat) => handleUpdateDetail(modal.category!, name, amt, modal.type === 'personal_detail', syncCat)} 
                  isPersonal={modal.type === 'personal_detail'}
                  churchCategories={Object.keys(data.expenses)}
                />
              </div>
            )}

            {modal.type === 'edit_personal_detail' && (
              <div className="p-6">
                 <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-800">{modal.category}</h3>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">내역 편집</p>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full active:bg-stone-100 transition-colors"><X size={20} /></button>
                </div>
                <EditDetailForm 
                   initialName={data.personalExpenseDetails[modal.category!][modal.detailIndex!].name}
                   initialAmount={data.personalExpenseDetails[modal.category!][modal.detailIndex!].amount}
                   churchCategories={Object.keys(data.expenses)}
                   onSave={(name, amt, syncCat) => handleEditPersonalDetail(modal.category!, modal.detailIndex!, name, amt, syncCat)}
                />
              </div>
            )}
            
            {modal.type === 'add_bank_deposit' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-black text-stone-800">입출금 내역 추가</h3>
                   <button onClick={() => { setModal({ ...modal, isOpen: false }); setBankType('deposit'); setSelectedPersonalCat(''); setBankAmountDisplay(''); }} className="p-2 bg-stone-50 text-stone-400 rounded-full"><X size={20} /></button>
                </div>
                <div className="flex gap-2 mb-4 p-1 bg-stone-50 rounded-2xl">
                  <button onClick={() => setBankType('deposit')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${bankType === 'deposit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}>입금 (+)</button>
                  <button onClick={() => setBankType('withdraw')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${bankType === 'withdraw' ? 'bg-white text-rose-500 shadow-sm' : 'text-stone-400'}`}>출금 (-)</button>
                </div>
                <div className="space-y-4">
                  {bankType === 'deposit' ? (
                    <>
                      <input id="bankName" type="text" placeholder="입금 내역 명칭" className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none focus:border-stone-200" autoFocus />
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        placeholder="금액 (원)" 
                        value={bankAmountDisplay}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setBankAmountDisplay(val === '' ? '' : Number(val).toLocaleString());
                        }}
                        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-black outline-none focus:border-stone-200" 
                      />
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest pl-1">출금할 개인지출 항목 선택</p>
                        <select 
                          value={selectedPersonalCat} 
                          onChange={e => setSelectedPersonalCat(e.target.value)} 
                          className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none text-stone-800 appearance-none transition-colors focus:border-stone-200"
                        >
                          <option value="">출금 항목 선택</option>
                          {Object.keys(data.personalExpenses || {}).map(cat => (
                            <option key={cat} value={cat}>
                              {cat} (₩{(data.personalExpenses[cat] || 0).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedPersonalCat && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                          <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest mb-1">출금 예정 금액</p>
                          <p className="text-xl font-black text-rose-600">₩{(data.personalExpenses[selectedPersonalCat] || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-rose-400 mt-2">* 해당 항목의 전체 합계가 출금 처리됩니다.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => {
                    const nameInput = document.getElementById('bankName') as HTMLInputElement | null;
                    const name = nameInput ? nameInput.value : '';
                    const amount = parseInt(bankAmountDisplay.replace(/,/g, '')) || 0;
                    
                    if (bankType === 'withdraw' && !selectedPersonalCat) {
                      alert('출금 항목을 선택해주세요.');
                      return;
                    }
                    if (bankType === 'deposit' && (!name || !amount)) {
                      alert('명칭과 금액을 입력해주세요.');
                      return;
                    }
                    handleAddBankRecord(name, amount, bankType, selectedPersonalCat);
                  }} className={`w-full py-4 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-transform ${bankType === 'withdraw' ? 'bg-rose-500 shadow-rose-100' : 'bg-emerald-500 shadow-emerald-100'}`}>
                    {bankType === 'withdraw' ? '출금 기록 저장' : '입금 기록 저장'}
                  </button>
                </div>
              </div>
            )}

            {modal.type === 'delete_bank_record' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-2">통장 내역 삭제</h3>
                <p className="text-stone-500 text-sm mb-8">"{modal.category}" 통장 기록을 삭제하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => removeBankRecord(modal.detailIndex!)} className="py-4 bg-rose-500 text-white font-bold rounded-2xl active:bg-rose-600">삭제 확인</button>
                </div>
              </div>
            )}

            {modal.type === 'counting' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-800">{modal.day} {modal.time}</h3>
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">계수표 입력</p>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  {DENOMINATIONS.map(denom => (
                    <div key={denom} className="flex items-center justify-between">
                      <span className="w-16 text-sm font-black text-stone-600">{denom.toLocaleString()}원</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          inputMode="numeric"
                          value={data.counting[modal.day!]?.[modal.time!]?.[denom] || ''} 
                          onChange={(e) => handleUpdateCounting(modal.day!, modal.time!, denom, e.target.value)}
                          className="w-24 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 font-black text-stone-600 text-center text-lg outline-none focus:bg-white focus:border-rose-400 transition-all"
                          placeholder="0"
                        />
                        <span className="text-xs font-bold text-stone-300">매</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-stone-600">항목 합계</span>
                    <span className="text-2xl font-black text-rose-500">₩{getCountingTotal(modal.day!, modal.time!).toLocaleString()}</span>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="w-full mt-6 py-4 bg-rose-400 text-white font-black rounded-2xl shadow-lg shadow-rose-100 active:scale-95 transition-transform">입력 완료</button>
                </div>
              </div>
            )}

            {modal.type === 'edit_cash' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-black text-stone-800">수기 현금 계수</h3>
                   <button onClick={() => setModal({ ...modal, isOpen: false })} className="p-2 bg-stone-50 text-stone-400 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                   {DENOMINATIONS.map(denom => (
                     <div key={denom} className="flex items-center justify-between">
                        <span className="w-16 text-sm font-black text-stone-600">{denom.toLocaleString()}원</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            inputMode="numeric"
                            value={data.counting['__manual__']?.['__cash__']?.[denom] || ''} 
                            onChange={(e) => handleUpdateManualCash(denom, e.target.value)}
                            className="w-24 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 font-black text-stone-600 text-center text-lg outline-none focus:bg-white focus:border-rose-400"
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-stone-300">매</span>
                        </div>
                     </div>
                   ))}
                   <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-stone-600">현금 총액</span>
                    <span className="text-2xl font-black text-rose-500">₩{manualCashTotal.toLocaleString()}</span>
                  </div>
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="w-full mt-6 py-4 bg-stone-800 text-white font-black rounded-2xl active:scale-95 transition-transform">저장 완료</button>
                </div>
              </div>
            )}

            {modal.type === 'reset' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><RotateCcw size={32} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-2">전체 초기화</h3>
                <p className="text-stone-500 text-sm mb-8">모든 재정 데이터가 삭제됩니다.<br/>이 작업은 되돌릴 수 없습니다.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={resetAllData} className="py-4 bg-rose-500 text-white font-bold rounded-2xl active:bg-rose-600">전체 삭제</button>
                </div>
              </div>
            )}
            
            {modal.type === 'rename' && (
              <div className="p-6">
                <h3 className="text-xl font-black text-stone-800 mb-4">이름 변경</h3>
                <input id="renameInput" type="text" defaultValue={modal.oldName} className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold mb-4 outline-none focus:border-stone-300" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleRenameCategory(modal.oldName!, (document.getElementById('renameInput') as HTMLInputElement).value, modal.isPersonal)} className="flex-1 py-4 bg-amber-400 text-white font-bold rounded-2xl active:bg-amber-500 shadow-lg shadow-amber-100">변경</button>
                </div>
              </div>
            )}

            {modal.type === 'delete_category' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-2">항목 삭제</h3>
                <p className="text-stone-500 text-sm mb-8">"{modal.category}" 항목을 삭제하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleDeleteCategory(modal.category!, false)} className="py-4 bg-rose-500 text-white font-bold rounded-2xl active:bg-rose-600">삭제 확인</button>
                </div>
              </div>
            )}

            {modal.type === 'delete_detail' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-2">내역 삭제</h3>
                <p className="text-stone-500 text-sm mb-8">선택한 상세 내역을 삭제하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleRemoveDetail(modal.category!, modal.detailIndex!, modal.isPersonal)} className="py-4 bg-rose-500 text-white font-bold rounded-2xl active:bg-rose-600">삭제 확인</button>
                </div>
              </div>
            )}

            {modal.type === 'add_category' && (
              <div className="p-6">
                <h3 className="text-xl font-black text-stone-800 mb-4">새 지출 항목</h3>
                <input id="newCat" type="text" className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold mb-4 outline-none focus:border-rose-400" placeholder="항목 이름" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleAddCategory((document.getElementById('newCat') as HTMLInputElement).value, false)} className="flex-1 py-4 bg-rose-400 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 active:scale-95 transition-transform">추가</button>
                </div>
              </div>
            )}

            {modal.type === 'add_personal_category' && (
              <div className="p-6">
                <h3 className="text-xl font-black text-stone-800 mb-4">새 개인 항목</h3>
                <input id="newPersonalCat" type="text" className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold mb-4 outline-none focus:border-indigo-400" placeholder="항목 이름" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="flex-1 py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleAddCategory((document.getElementById('newPersonalCat') as HTMLInputElement).value, true)} className="flex-1 py-4 bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-transform">추가</button>
                </div>
              </div>
            )}
            
            {modal.type === 'delete_personal_category' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-2">개인 항목 삭제</h3>
                <p className="text-stone-500 text-sm mb-8">"{modal.category}" 개인 항목을 삭제하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="py-4 bg-stone-100 text-stone-500 font-bold rounded-2xl active:bg-stone-200">취소</button>
                  <button onClick={() => handleDeleteCategory(modal.category!, true)} className="py-4 bg-rose-500 text-white font-bold rounded-2xl active:bg-rose-600">삭제 확인</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DetailForm = ({ onAdd, isPersonal, churchCategories }: { onAdd: (name: string, amt: number, syncCat?: string) => void, isPersonal: boolean, churchCategories: string[] }) => {
  const [name, setName] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '') {
      setAmountDisplay('');
      return;
    }
    setAmountDisplay(Number(value).toLocaleString());
  };

  const [syncCat, setSyncCat] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amountDisplay) return;
    const numericAmount = parseInt(amountDisplay.replace(/,/g, ''));
    onAdd(name, numericAmount, syncCat);
    setName('');
    setAmountDisplay('');
    setSyncCat('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input 
        type="text" 
        value={name} 
        onChange={e => setName(e.target.value)} 
        placeholder="항목 명칭 (예: 꽃꽂이, 간식비)" 
        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none focus:border-stone-200 transition-colors" 
        required 
      />
      <input 
        type="text" 
        inputMode="numeric" 
        value={amountDisplay} 
        onChange={handleAmountChange} 
        placeholder="금액 (예: 50,000)" 
        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-black outline-none focus:border-stone-200 transition-colors" 
        required 
      />
      {isPersonal && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest pl-1">지출 항목 연결</p>
          <select value={syncCat} onChange={e => setSyncCat(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none text-stone-500 appearance-none transition-colors focus:border-stone-200">
            <option value="">연결 안함</option>
            {churchCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      )}
      <button type="submit" className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 ${isPersonal ? 'bg-indigo-500 shadow-indigo-100' : 'bg-rose-400 shadow-rose-100'}`}>추가하기</button>
    </form>
  );
};

const EditDetailForm = ({ initialName, initialAmount, churchCategories, onSave }: { initialName: string, initialAmount: number, churchCategories: string[], onSave: (name: string, amt: number, syncCat?: string) => void }) => {
  const [name, setName] = useState(initialName);
  const [amountDisplay, setAmountDisplay] = useState(initialAmount.toLocaleString());
  const [syncCat, setSyncCat] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '') {
      setAmountDisplay('');
      return;
    }
    setAmountDisplay(Number(value).toLocaleString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amountDisplay) return;
    const numericAmount = parseInt(amountDisplay.replace(/,/g, ''));
    onSave(name, numericAmount, syncCat);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input 
        type="text" 
        value={name} 
        onChange={e => setName(e.target.value)} 
        placeholder="항목 명칭" 
        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none focus:border-stone-200 transition-colors" 
        required 
        autoFocus
      />
      <input 
        type="text" 
        inputMode="numeric" 
        value={amountDisplay} 
        onChange={handleAmountChange} 
        placeholder="금액" 
        className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-black outline-none focus:border-stone-200 transition-colors" 
        required 
      />
      <div className="space-y-2">
        <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest pl-1">지출 항목 연결 (수정)</p>
        <select value={syncCat} onChange={e => setSyncCat(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl font-bold outline-none text-stone-500 appearance-none transition-colors focus:border-stone-200">
          <option value="">기존 연결 유지/안함</option>
          {churchCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <button type="submit" className="w-full py-4 bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95">수정 완료</button>
    </form>
  );
};

export default App;
