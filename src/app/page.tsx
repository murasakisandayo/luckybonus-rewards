"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [userIdInput, setUserIdInput] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showPolicy, setShowPolicy] = useState(false);
  const router = useRouter();

  // 端末のlocalStorageから履歴を読み込む
  useEffect(() => {
    const saved = localStorage.getItem("lakibo_recent_ids");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setRecentIds(parsed);
        }, 0);
      } catch (e) {
        console.error("履歴読み込みエラー:", e);
      }
    }
  }, []);

  // 入力された文字列（IDまたはURL）から8桁IDを自動抽出する関数
  const extractUserId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    // URL内に "/p/" が含まれている場合（例: https://example.com/p/a1b2c3d4）
    if (trimmed.includes("/p/")) {
      const parts = trimmed.split("/p/");
      const afterP = parts[parts.length - 1];
      if (afterP) {
        return afterP.split("/")[0].split("?")[0].split("#")[0];
      }
    }

    // その他、スラッシュが含まれるURL形式の場合
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        return lastPart.split("?")[0].split("#")[0];
      }
    }

    // そのままのIDの場合
    return trimmed;
  };

  // 検索・移動処理（履歴を最新3件まで保存）
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractUserId(userIdInput);
    if (!id) return;

    saveAndNavigate(id);
  };

  const saveAndNavigate = (rawInput: string) => {
    const id = extractUserId(rawInput);
    if (!id) return;

    const updated = [id, ...recentIds.filter((item) => item !== id)].slice(0, 3);
    setRecentIds(updated);
    localStorage.setItem("lakibo_recent_ids", JSON.stringify(updated));
    router.push(`/p/${id}`);
  };

  // 履歴クリア
  const handleClearRecent = () => {
    setRecentIds([]);
    localStorage.removeItem("lakibo_recent_ids");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-purple-100 to-indigo-100 p-4 sm:p-6 flex flex-col items-center justify-between">
      <div className="w-full max-w-md space-y-5 pt-4">
        {/* ヘッダータイトル */}
        <div className="text-center space-y-2">
          <span className="inline-block bg-purple-600 text-yellow-300 text-[10px] font-black px-3 py-0.5 rounded-full shadow-sm tracking-wider">
            ★ 公式ポータル ★
          </span>
          <h1 className="text-3xl font-black text-purple-950 tracking-tight drop-shadow-sm">
            ラッキーボーナスリワード
          </h1>
          <p className="text-xs text-purple-800 font-medium">
            景品交換ポイントの確認サービス
          </p>
        </div>

        {/* メインカード（ID/URL入力＆検索） */}
        <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-purple-300 p-6 shadow-xl shadow-purple-200/60 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold text-slate-800">
              マイページへのアクセス
            </h2>
            <p className="text-xs text-slate-500">
              **8桁のユーザーID** または **マイページのURL** を入力してください
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="ID (例: a1b2c3d4) または URLを貼り付け"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl text-center text-sm font-bold text-purple-900 placeholder-purple-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow-md shadow-purple-300/50 transition active:scale-[0.98] text-sm flex items-center justify-center gap-1"
            >
              <span>ポイントの確認</span>
              <span>→</span>
            </button>
          </form>
        </div>

        {/* 最近確認したページ（履歴がある場合のみ表示） */}
        {recentIds.length > 0 && (
          <div className="bg-white/80 border border-purple-200 rounded-2xl p-4 shadow-sm backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                <span>🕒</span> 最近確認したID
              </span>
              <button
                onClick={handleClearRecent}
                className="text-[10px] text-purple-400 hover:text-purple-600 underline"
              >
                履歴を消去
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentIds.map((id) => (
                <button
                  key={id}
                  onClick={() => saveAndNavigate(id)}
                  className="flex-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-mono font-bold text-xs py-2 px-3 rounded-xl transition text-center shadow-xs"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 控えめな管理者用リンク */}
        <div className="text-center pt-2">
          <a
            href="/admin"
            className="text-[11px] text-purple-400 hover:text-purple-600 transition"
          >
            ※ 運営者用ログイン画面はこちら
          </a>
        </div>
      </div>

      {/* フッター（規約・ポリシー ＆ 最終更新日） */}
      <footer className="w-full max-w-md pt-8 pb-4 text-center space-y-2">
        <button
          onClick={() => setShowPolicy(true)}
          className="text-xs text-purple-700 underline hover:text-purple-900 transition font-medium"
        >
          利用規約・プライバシーポリシー
        </button>
        <p className="text-[10px] text-purple-400">最終更新日：2026年8月25日</p>
      </footer>

      {/* 規約・プライバシーポリシー用モーダル */}
      {showPolicy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 text-slate-700 text-xs leading-relaxed shadow-2xl border border-purple-200">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">
              利用規約・個人情報の取り扱い
            </h3>

            <div className="space-y-3">
              <section className="space-y-1">
                <h4 className="font-bold text-slate-800">1. ポイントに関する重要事項</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>本サービスで付与されるポイントは、現金への換金・返金・売買・譲渡は一切できません。</li>
                  <li>本ポイントは資金決済法上の有価証券や決済手段ではなく、当イベント/サービス内でのみ使用可能な限定特典・数値です。</li>
                  <li>運営上の理由により、予告なくポイント付与基準の変更、利用停止、またはサービスを終了する場合があります。</li>
                </ul>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-slate-800">2. 個人情報の取り扱い（プライバシーポリシー）</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><b>取得する情報：</b> ユーザー名、ポイント保有数、獲得・利用履歴。</li>
                  <li><b>利用目的：</b> ポイントの正確な管理・付与、お問い合わせ対応のため。</li>
                  <li><b>第三者提供：</b> 法令に基づく場合を除き、取得したデータを第三者に開示・提供することはありません。</li>
                </ul>
              </section>

              <section className="space-y-1 pt-2 border-t">
                <p className="text-[10px] text-slate-400">最終更新日：2026年8月25日</p>
              </section>
            </div>

            <button
              onClick={() => setShowPolicy(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition mt-4"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}