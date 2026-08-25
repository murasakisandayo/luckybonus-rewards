"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  point_change: number;
  event_name: string;
  reason: string;
  created_at: string;
}

interface User {
  id: string;
  display_name: string;
}

export default function UserPointPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(false);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, display_name")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        setError(true);
        setLoading(false);
        return;
      }

      setUser(userData);

      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (txData) {
        setTransactions(txData);
      }

      setLoading(false);
    }

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-100 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-purple-700 animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-purple-100 flex items-center justify-center p-4">
        <div className="bg-white border border-purple-300 p-6 rounded-2xl max-w-sm w-full text-center shadow-md">
          <p className="text-red-600 font-bold mb-1">ユーザーが見つかりません</p>
          <p className="text-xs text-slate-500">URLが正しいかご確認ください。</p>
        </div>
      </div>
    );
  }

  const totalPoints = transactions.reduce((acc, cur) => acc + cur.point_change, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-purple-100 to-indigo-100 p-4 sm:p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-md space-y-5 pt-2">
        {/* ヘッダータイトル */}
        <div className="text-center space-y-1">
          <span className="inline-block bg-purple-600 text-yellow-300 text-[10px] font-black px-3 py-0.5 rounded-full shadow-sm tracking-wider">
            ★ ラキボリワード ★
          </span>
          <h1 className="text-2xl font-black text-purple-950 tracking-tight drop-shadow-sm">
            持ち越しポイント確認
          </h1>
        </div>

        {/* メインのデジタルカード（明るいパステル調） */}
        <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-purple-300 p-6 shadow-xl shadow-purple-200/60">
          <div className="absolute -top-3 -right-3 text-purple-200 text-8xl select-none font-black pointer-events-none">★</div>
          <div className="absolute -bottom-6 -left-4 text-purple-100 text-9xl select-none font-black pointer-events-none">★</div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-purple-100 border border-purple-300 px-4 py-1 rounded-full mb-2">
              <span className="text-xs text-purple-800 font-bold">参加者名</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-5">
              {user.display_name} <span className="text-xs font-normal text-slate-500">様</span>
            </h2>

            {/* ポイント表示エリア（ロゴの黄色を意識した大きな数字） */}
            <div className="w-full bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300/80 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs font-extrabold text-amber-800 mb-1">現在の保有ポイント</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-amber-600 drop-shadow">
                  {totalPoints}
                </span>
                <span className="text-base font-bold text-amber-800">pt</span>
              </div>
            </div>
          </div>
        </div>

        {/* 履歴リスト */}
        <div className="bg-white/90 border border-purple-200 rounded-2xl p-5 shadow-md backdrop-blur-sm">
          <h3 className="text-xs font-bold text-purple-900 mb-3 flex items-center gap-1 border-b border-purple-100 pb-2">
            <span>★</span> ポイント獲得・利用履歴
          </h3>

          {transactions.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">履歴はありません</p>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-purple-50/60 border border-purple-200/70 p-3 rounded-xl flex items-center justify-between text-xs gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{tx.event_name || "ラキボ杯"}</p>
                    <p className="text-[10px] text-slate-500">{tx.reason || "-"}</p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div
                    className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                      tx.point_change > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-rose-50 text-rose-600 border-rose-300"
                    }`}
                  >
                    {tx.point_change > 0 ? `+${tx.point_change}` : tx.point_change} pt
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}