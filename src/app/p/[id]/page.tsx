"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface UserItem {
  id: string;
  name: string;
  points: number;
  created_at?: string;
}

interface TransactionItem {
  id: string;
  user_id: string;
  amount: number;
  description?: string;
  created_at: string;
}

interface PublicUserPageData {
  user: UserItem | null;
  transactions: TransactionItem[];
}

export default function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<UserItem | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_public_user_page", {
        p_user_id: userId,
      });

      if (error) {
        console.error("公開ページ取得エラー:", error);

        if (isSubscribed) {
          setUser(null);
          setTransactions([]);
          setLoading(false);
        }

        return;
      }

      if (!isSubscribed) return;

      const result = data as PublicUserPageData | null;

      if (!result || !result.user) {
        setUser(null);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setUser(result.user);
      setTransactions(result.transactions || []);
      setLoading(false);
    };

    void fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const handleCopyPageUrl = async () => {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("URLコピーエラー:", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-200 via-purple-100 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-purple-900">
            情報を読み込み中...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-200 via-purple-100 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-purple-200 text-center space-y-4">
          <div className="text-4xl">🔍</div>

          <h1 className="text-lg font-extrabold text-slate-800">
            ページが見つかりませんでした
          </h1>

          <p className="text-xs text-slate-500 leading-relaxed">
            入力されたID（
            <span className="font-mono font-bold text-purple-950">
              {userId}
            </span>
            ）に対応するマイページが存在しないか、URLが変更された可能性があります。
          </p>

          <Link
            href="/"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-2.5 rounded-2xl text-xs transition shadow-md"
          >
            トップページに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-200 via-purple-100 to-indigo-100 p-4 sm:p-6 flex flex-col items-center justify-between">
      <div className="w-full max-w-md space-y-5 pt-4">
        {/* トップへ戻るリンク ＆ タイトル */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-purple-800 hover:text-purple-950 flex items-center gap-1 bg-white/60 hover:bg-white/80 px-3 py-1.5 rounded-full transition border border-purple-200"
          >
            <span>← トップへ</span>
          </Link>

          <span className="text-[10px] font-mono font-extrabold text-purple-700 bg-purple-200/80 px-2.5 py-0.5 rounded-full">
            ID: {user.id}
          </span>
        </div>

        {/* ポイント残高メインカード */}
        <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-purple-300 p-6 shadow-xl shadow-purple-200/60 text-center space-y-4">
          <div className="space-y-1">
            <span className="inline-block bg-purple-100 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              マイページ
            </span>

            <h1 className="text-xl font-extrabold text-slate-800">
              {user.name} 様
            </h1>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 space-y-1 shadow-inner">
            <span className="text-xs font-bold text-purple-600">
              現在ポイント
            </span>

            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-black text-purple-950 tracking-tight">
                {user.points.toLocaleString()}
              </span>

              <span className="text-sm font-bold text-purple-700">pt</span>
            </div>
          </div>

          {/* ページURLコピーボタン */}
          <button
            onClick={() => void handleCopyPageUrl()}
            className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <span>🔗 マイページのURLを保存・コピー</span>

            {copied && (
              <span className="text-[10px] text-emerald-600 font-extrabold">
                コピー完了!
              </span>
            )}
          </button>
        </div>

        {/* URLの管理に関する注意事項 */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 shadow-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <span>🔒</span>
            <span>URLの管理についてのお願い</span>
          </div>

          <p className="text-[11px] leading-relaxed text-amber-800/90 pl-5">
            本ページ（専用URL）を知っている方はどなたでも残高をご確認いただけます。第三者へのURLの漏洩には十分ご注意ください。
          </p>
        </div>

        {/* ポイント利用・獲得履歴 */}
        <div className="bg-white/80 border border-purple-200 rounded-2xl p-4 shadow-sm backdrop-blur-sm space-y-3">
          <h2 className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
            <span>📋</span>
            ポイント獲得・利用履歴
          </h2>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-white rounded-xl border border-dashed border-purple-100">
                履歴はありません
              </p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-purple-100 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">
                      {tx.description || "ポイント変更"}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <span
                    className={`font-mono font-extrabold px-2.5 py-1 rounded-lg text-xs ${
                      tx.amount >= 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-600 border border-rose-200"
                    }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} pt
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className="w-full max-w-md pt-8 pb-4 text-center">
        <p className="text-[10px] text-purple-400">
          ラキボリワード 公式ポータル
        </p>
      </footer>
    </main>
  );
}