"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UserItem {
  id: string;
  name: string;
  points: number;
  note?: string;
  created_at?: string;
}

interface TransactionItem {
  id: string;
  user_id: string;
  amount: number;
  description?: string;
  type?: string;
  created_at: string;
};

/**
 * 暗号学的に安全な乱数を使って8桁IDを生成
 */
const generate8DigitId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(8);

  crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    (value) => chars[value % chars.length]
  ).join("");
};

export default function AdminPage() {
  // ログイン情報
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 新規追加用フォーム
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState<number | "">(0);
  const [newNote, setNewNote] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ユーザー詳細・増減モーダル用ステート
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userTransactions, setUserTransactions] = useState<
    TransactionItem[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ポイント増減入力用ステート
  const [changeType, setChangeType] = useState<"add" | "sub">("add");
  const [pointAmount, setPointAmount] = useState<number | "">("");
  const [reasonCategory, setReasonCategory] = useState<
    "持ち越し" | "景品交換" | "その他"
  >("持ち越し");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supabase Authのログイン状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();

      setIsAuthenticated(!!data.session);
      setIsMounted(true);
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ユーザー取得エラー:", error);
    } else if (data) {
      setUsers(data as UserItem[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isSubscribed = true;

    const loadInitialData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isSubscribed) return;

      if (error) {
        console.error("ユーザー取得エラー:", error);
      } else if (data) {
        setUsers(data as UserItem[]);
      }

      setLoading(false);
    };

    void loadInitialData();

    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated]);

  // 特定ユーザーの履歴取得
  const fetchUserTransactions = async (userId: string) => {
    setLoadingHistory(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("履歴取得エラー:", error);
      setUserTransactions([]);
    } else {
      setUserTransactions((data as TransactionItem[]) || []);
    }

    setLoadingHistory(false);
  };

  // ユーザー選択時にモーダルを開いて履歴を取得
  const handleOpenUserModal = (user: UserItem) => {
    setSelectedUser(user);
    setPointAmount("");
    setReasonCategory("持ち越し");
    setCustomReason("");
    setChangeType("add");

    void fetchUserTransactions(user.id);
  };

  // 理由タブ変更時の自動連動処理
  const handleReasonCategoryChange = (
    cat: "持ち越し" | "景品交換" | "その他"
  ) => {
    setReasonCategory(cat);

    if (cat === "持ち越し") {
      setChangeType("add");
    } else if (cat === "景品交換") {
      setChangeType("sub");
    }
  };

  // ログイン
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailInput.trim() || !passwordInput) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });

    if (error) {
      console.error("ログインエラー:", error);
      alert("メールアドレスまたはパスワードが違います");
    }
  };

  // ログアウト
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ログアウトエラー:", error);
      alert("ログアウトに失敗しました");
    }
  };

  // 新規ユーザー登録
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newName.trim();
    const trimmedNote = newNote.trim();

    if (!trimmedName) {
      alert("名前を入力してください");
      return;
    }

    const initPoints = typeof newPoints === "number" ? newPoints : 0;

    if (!Number.isInteger(initPoints) || initPoints < 0) {
      alert("初期ポイントは0以上の整数で入力してください");
      return;
    }

    if (initPoints > 100000) {
      alert("初期ポイントは100000pt以下で入力してください");
      return;
    }

    if (trimmedName.length > 100) {
      alert("名前は100文字以内で入力してください");
      return;
    }

    if (trimmedNote.length > 200) {
      alert("メモは200文字以内で入力してください");
      return;
    }

    const shortId = generate8DigitId();

    const { data, error } = await supabase.rpc("admin_create_user", {
      p_user_id: shortId,
      p_name: trimmedName,
      p_points: initPoints,
      p_note: trimmedNote || null,
    });

    if (error) {
      console.error("ユーザー作成エラー:", error);
      alert("追加に失敗しました: " + error.message);
      return;
    }

    const createdUser = data as UserItem;

    setNewName("");
    setNewPoints(0);
    setNewNote("");

    setUsers((prev) => [createdUser, ...prev]);
  };

  // ポイント増減処理
  const handleUpdateUserPoints = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert("ユーザーが選択されていません");
      return;
    }

    if (pointAmount === "" || !Number.isInteger(pointAmount)) {
      alert("ポイント数を整数で入力してください");
      return;
    }

    if (pointAmount <= 0) {
      alert("1以上のポイント数を入力してください");
      return;
    }

    if (pointAmount > 100000) {
      alert("一度に変更できるポイントは100000ptまでです");
      return;
    }

    const finalReason =
      reasonCategory === "その他"
        ? customReason.trim() || "ポイント調整"
        : reasonCategory;

    if (finalReason.length > 200) {
      alert("理由は200文字以内で入力してください");
      return;
    }

    if (changeType === "sub" && pointAmount > selectedUser.points) {
      alert(
        `残高不足です。\n現在の保有ポイント: ${selectedUser.points.toLocaleString()} pt`
      );
      return;
    }

    setIsSubmitting(true);

    const actualChange =
      changeType === "add" ? pointAmount : -pointAmount;

    const { data, error } = await supabase.rpc(
      "admin_update_user_points",
      {
        p_user_id: selectedUser.id,
        p_amount: actualChange,
        p_description: finalReason,
      }
    );

    if (error) {
      console.error("ポイント更新エラー:", error);
      alert("ポイントの更新に失敗しました: " + error.message);
      setIsSubmitting(false);
      return;
    }

    const updatedUser = data as UserItem;

    setSelectedUser(updatedUser);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      )
    );

    setPointAmount("");
    setCustomReason("");
    setIsSubmitting(false);

    void fetchUserTransactions(updatedUser.id);
  };

  // URLコピー
  const handleCopyUrl = async (id: string) => {
    const url = `${window.location.origin}/p/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error("URLコピーエラー:", error);
      alert("URLのコピーに失敗しました");
    }
  };

  if (!isMounted) return null;

  // 未ログイン
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-slate-800">
              運営管理画面
            </h1>

            <p className="text-xs text-slate-500">
              メールアドレスとパスワードを入力してください
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="メールアドレス"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="password"
              placeholder="パスワード"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg text-sm transition"
            >
              ログイン
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              運営管理ダッシュボード
            </h1>

            <p className="text-xs text-slate-500">
              名前タップでポイント変更・履歴確認ができます
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>

        {/* ユーザー新規登録 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 border-b pb-2">
            新規ユーザー登録 (8桁IDを自動生成)
          </h2>

          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              placeholder="お名前 / ユーザー名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              maxLength={100}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="number"
              placeholder="初期ポイント"
              value={newPoints}
              min={0}
              max={100000}
              step={1}
              onChange={(e) =>
                setNewPoints(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="text"
              placeholder="メモ (任意)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              maxLength={200}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="sm:col-span-3 text-right">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
              >
                新規作成＆8桁ID発行
              </button>
            </div>
          </form>
        </div>

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              登録済みユーザー一覧 ({users.length}名)
            </h2>

            <button
              onClick={() => void fetchUsers()}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              最新状態に更新
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">
              読み込み中...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              登録されているユーザーはいません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">8桁ID</th>
                    <th className="px-4 py-3">名前 (タップで編集)</th>
                    <th className="px-4 py-3">現在ポイント</th>
                    <th className="px-4 py-3">メモ</th>
                    <th className="px-4 py-3 text-right">共有</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {user.id}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenUserModal(user)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-left"
                        >
                          <span>{user.name}</span>

                          <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded">
                            管理
                          </span>
                        </button>
                      </td>

                      <td className="px-4 py-3 text-slate-800 font-bold">
                        {user.points.toLocaleString()} pt
                      </td>

                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">
                        {user.note || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void handleCopyUrl(user.id)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-medium"
                        >
                          {copiedId === user.id
                            ? "コピー完了!"
                            : "URLコピー"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ユーザー詳細モーダル */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-200">
            {/* モーダルヘッダー */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {selectedUser.id}
                </span>

                <h3 className="text-lg font-bold text-slate-800">
                  {selectedUser.name} 様
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500">
                  現在の保有
                </span>

                <p className="text-xl font-black text-indigo-600">
                  {selectedUser.points.toLocaleString()} pt
                </p>
              </div>
            </div>

            {/* ポイント増減フォーム */}
            <form
              onSubmit={handleUpdateUserPoints}
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ポイント操作
              </h4>

              {/* 理由カテゴリ */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  理由・種別
                </label>

                <div className="flex gap-2">
                  {(["持ち越し", "景品交換", "その他"] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleReasonCategoryChange(cat)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                          reasonCategory === cat
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 加算 / 減算 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChangeType("add")}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    changeType === "add"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ＋ ポイント追加 (加算)
                </button>

                <button
                  type="button"
                  onClick={() => setChangeType("sub")}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    changeType === "sub"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  － ポイント利用 (減算)
                </button>
              </div>

              {/* ポイント数 */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {changeType === "add"
                    ? "加算するポイント数"
                    : "減算するポイント数"}
                </label>

                <input
                  type="number"
                  placeholder="例: 1000"
                  value={pointAmount}
                  min={1}
                  max={100000}
                  step={1}
                  onChange={(e) =>
                    setPointAmount(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* その他 */}
              {reasonCategory === "その他" && (
                <div>
                  <input
                    type="text"
                    placeholder="理由を入力してください"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition ${
                  changeType === "add"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {isSubmitting
                  ? "処理中..."
                  : changeType === "add"
                    ? `${pointAmount || 0} pt を加算する`
                    : `${pointAmount || 0} pt を減算する`}
              </button>
            </form>

            {/* 履歴 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                過去の獲得・利用履歴
              </h4>

              {loadingHistory ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  履歴を読み込み中...
                </p>
              ) : userTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed">
                  履歴はありません
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {userTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {tx.description || "ポイント変更"}
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>

                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          tx.amount > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-600 border border-rose-200"
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 閉じる */}
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}