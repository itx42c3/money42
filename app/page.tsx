'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wallet, Key, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBalance(session.user.id);
    });
  }, []);

  const fetchBalance = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    if (data) setBalance(data.balance);
  };

  const handleAuth = async (type: 'signup' | 'login') => {
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
    setLoading(false);
  };

  const processCode = async () => {
    if (!inputCode) return;
    setLoading(true);
    
    const { data: codeData, error } = await supabase
      .from('transaction_codes')
      .select('*')
      .eq('code', inputCode)
      .eq('is_used', false)
      .single();

    if (error || !codeData) {
      alert("無効なコード、または使用済みです");
      setLoading(false);
      return;
    }

    const amountChange = codeData.type === 'deposit' ? codeData.amount : -codeData.amount;
    const newBalance = balance + amountChange;

    if (newBalance < 0) {
      alert("残高が足りません！");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
    await supabase.from('transaction_codes').update({ is_used: true, used_by: user.id }).eq('id', codeData.id);

    if (updateError) alert("エラーが発生しました");
    else alert(`${codeData.type === 'deposit' ? '入金' : '出金'}成功: ¥${codeData.amount}`);
    
    setInputCode('');
    fetchBalance(user.id);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
        <h1 className="text-5xl font-black mb-8 text-yellow-400 italic">money42</h1>
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
          <input className="w-full bg-gray-700 border-none p-3 mb-4 rounded-lg" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="w-full bg-gray-700 border-none p-3 mb-6 rounded-lg" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg mb-3" onClick={() => handleAuth('login')}>ログイン</button>
          <button className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg" onClick={() => handleAuth('signup')}>新規登録</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-yellow-400 italic">money42</h1>
        <button className="text-sm bg-gray-800 px-3 py-1 rounded" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}>ログアウト</button>
      </header>

      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 p-8 rounded-3xl shadow-2xl mb-8 text-black">
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Total Balance</p>
          <h2 className="text-5xl font-black my-2">¥{balance.toLocaleString()}</h2>
          <div className="flex gap-2 mt-4">
            <div className="bg-black/10 px-3 py-1 rounded-full text-xs font-bold">User: {user.email.split('@')[0]}</div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <label className="block text-sm font-bold mb-3 text-gray-400">入出金コード入力</label>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-gray-700 border-none p-4 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" 
              value={inputCode} 
              onChange={e => setInputCode(e.target.value)} 
              placeholder="例: START_5000" 
            />
            <button 
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 rounded-xl font-black transition-all active:scale-95 disabled:opacity-50"
              onClick={processCode}
            >
              {loading ? '...' : '実行'}
            </button>
          </div>
        </div>
        
        <p className="text-center text-gray-500 text-xs mt-10 italic">© 2026 money42 Project</p>
      </div>
    </div>
  );
}
