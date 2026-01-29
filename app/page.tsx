'use client';
import { useState, useEffect } from 'react';
// エラー回避のため、パスを相対指定に変更しました
import { supabase } from '../lib/supabaseClient';
import { Wallet, Key, ArrowUpRight, ArrowDownLeft, LogOut } from 'lucide-react';

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBalance(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchBalance = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    if (data) setBalance(data.balance);
    // profilesがまだない新規ユーザー向けに、ここで作成されるのを待つか再試行する処理は今回は簡略化
  };

  const handleAuth = async (type: 'signup' | 'login') => {
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const processCode = async () => {
    if (!inputCode) return;
    setLoading(true);
    
    // コードの存在確認
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

    // 更新処理
    const { error: updateError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
    await supabase.from('transaction_codes').update({ is_used: true, used_by: user.id }).eq('id', codeData.id);

    if (updateError) {
      alert("エラーが発生しました");
    } else {
      alert(`${codeData.type === 'deposit' ? '入金' : '出金'}成功: ¥${codeData.amount}`);
      setInputCode('');
      fetchBalance(user.id);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 font-sans">
        <h1 className="text-6xl font-black mb-10 text-yellow-400 italic tracking-tighter">money42</h1>
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm">
          <input className="w-full bg-gray-800 border-none p-4 mb-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="w-full bg-gray-800 border-none p-4 mb-8 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-500" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-4 rounded-xl mb-4 transition-all active:scale-95" onClick={() => handleAuth('login')}>
            LOGIN
          </button>
          <button className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-400 font-bold py-4 rounded-xl transition-all" onClick={() => handleAuth('signup')}>
            SIGN UP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <header className="flex justify-between items-center max-w-md mx-auto py-6">
        <h1 className="text-3xl font-black text-yellow-400 italic">money42</h1>
        <button className="p-2 bg-gray-900 rounded-full hover:bg-red-900 transition-colors" onClick={() => supabase.auth.signOut()}>
          <LogOut size={20} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* バランスカード */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-[2.5rem] shadow-2xl text-black">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black uppercase opacity-60 tracking-widest mb-1">Available Balance</p>
              <h2 className="text-5xl font-black tracking-tighter">¥{balance.toLocaleString()}</h2>
            </div>
            <Wallet size={32} className="opacity-20" />
          </div>
          <div className="mt-6 flex gap-2">
            <span className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              ID: {user.email?.split('@')[0]}
            </span>
          </div>
        </div>

        {/* 入力セクション */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Key size={16} />
            <label className="text-xs font-black uppercase tracking-widest">Transaction Code</label>
          </div>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-gray-800 border-none p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-500 font-mono" 
              value={inputCode} 
              onChange={e => setInputCode(e.target.value)} 
              placeholder="ENTER CODE..." 
            />
            <button 
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50"
              onClick={processCode}
            >
              {loading ? '...' : 'GO'}
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className="pt-10 text-center">
          <p className="text-[10px] text-gray-700 font-bold tracking-[0.2em] uppercase italic">
            Secure Digital Wallet System v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
