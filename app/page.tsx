'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, Key, LogOut, TrendingUp } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // セッション確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBalance(session.user.id);
    });

    // ログイン状態の監視
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBalance(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchBalance = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    if (data) {
      setBalance(data.balance);
    } else {
      // プロフィールがない場合は新規作成（初期値0円）
      await supabase.from('profiles').insert([{ id: userId, balance: 0 }]);
    }
  };

  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin
      }
    });
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

    if (updateError) {
      alert("エラーが発生しました");
    } else {
      alert(`成功: ¥${codeData.amount}`);
      setInputCode('');
      fetchBalance(user.id);
    }
    setLoading(false);
  };

  // ログイン前の画面
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="mb-12 text-center">
          <h1 className="text-7xl font-black text-yellow-400 italic tracking-tighter mb-2">money42</h1>
          <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-xs text-center">Next-Gen Digital Asset</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={handleDiscordLogin}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
          >
            <img src="https://assets-global.website-files.com/6257adef93867e3504d8840a/636e0a22490082217744365b_icon_clyde_white_RGB.svg" width="24" alt="Discord" />
            DISCORDでログイン
          </button>
          <p className="text-[10px] text-gray-600 text-center px-8">
            ログインすることで、money42の利用規約に同意したことになります。
          </p>
        </div>
      </div>
    );
  }

  // ログイン後のメイン画面
  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <header className="flex justify-between items-center max-w-md mx-auto py-6">
        <h1 className="text-3xl font-black text-yellow-400 italic">money42</h1>
        <button className="p-2 bg-gray-900 rounded-full hover:bg-red-900 transition-colors text-gray-400" onClick={() => supabase.auth.signOut()}>
          <LogOut size={20} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* 残高カード */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-[2.5rem] shadow-2xl text-black relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase opacity-60 tracking-widest mb-1">Current Balance</p>
            <h2 className="text-5xl font-black tracking-tighter">¥{balance.toLocaleString()}</h2>
            <div className="mt-6 inline-block bg-black/10 px-3 py-1 rounded-full text-[10px] font-bold">
              USER: {user.user_metadata.full_name || user.email?.split('@')[0]}
            </div>
          </div>
          <TrendingUp size={120} className="absolute -right-4 -bottom-4 opacity-10 text-black" />
        </div>

        {/* コード入力 */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Key size={16} />
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">Deposit / Withdraw Code</label>
          </div>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-gray-800 border-none p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-500 font-mono placeholder:text-gray-700" 
              value={inputCode} 
              onChange={e => setInputCode(e.target.value)} 
              placeholder="0000-0000" 
            />
            <button 
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50"
              onClick={processCode}
            >
              {loading ? '...' : 'SEND'}
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className="pt-10 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.3em]">System Terminal ID: 42-ALPHA</p>
        </div>
      </div>
    </div>
  );
}
