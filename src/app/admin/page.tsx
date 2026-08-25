"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UserItem {
  id: string;
  display_name: string;
  created_at: string;
  transactions?: { point_change: number }[];
}

export default function AdminPage() {
  // 初期化時に sessionStorage をチェック（useEffect 内での setState を回避）
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_authenticated") === "true";
    }
    return false;
  });

  const [inputPassword, setInputPassword] = useState("");
  const [passError, setPassError] = useState("");

  const [activeTab, setActiveTab] = useState<"register" | "transaction" | "list">("register");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [regName, setRegName] = useState("");
  const [regPoints, setRegPoints] = useState<number | "">("");
  const [regEvent, setRegEvent] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [txType, setTxType] = useState<"add" | "sub">("add");
  const [txPoints, setTxPoints] = useState<number | "">("");
  const [txEvent, setTxEvent] = useState("");
  const [txReason, setTxReason] = useState("");
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "lucky1234";

    if (inputPassword === envPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setPassError("");
    } else {
      setPassError("パスワードが違います。");
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, created_at, transactions(point_change)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data as UserItem[]);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // setTimeout でコールバック化し、useEffect 直後の同期的 setState を回避
      const timer = setTimeout(() => {
        fetchUsers();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, fetchUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    let isMounted = true;
    const fetchCurrentPoints = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("point_change")
        .eq("user_id", selectedUserId);

      if (isMounted && !error && data) {
        const total = data.reduce((acc, cur) => acc + cur.point_change, 0);
        setCurrentPoints(total);
      }
    };

    fetchCurrentPoints();

    return () => {
      isMounted = false;
    };
  }, [selectedUserId, successMsg]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    if (!id) {
      setCurrentPoints(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || regPoints === "" || Number(regPoints) <= 0) {
      setErrorMsg("参加者名と1pt以上の持ち越しポイントを入力してください。");
      return;
    }

    setRegLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setCreatedUrl(null);

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([{ display_name: regName }])
        .select()
        .single();

      if (userError || !userData) throw new Error(userError?.message || "登録失敗");

      const { error: txError } = await supabase.from("transactions").insert([
        {
          user_id: userData.id,
          point_change: Number(regPoints),
          event_name: regEvent || "ラキボ杯",
          reason: "初回持ち越し",
        },
      ]);

      if (txError) throw new Error(txError.message);

      const url = `${window.location.origin}/p/${userData.id}`;
      setCreatedUrl(url);
      setSuccessMsg(`${regName} 様を登録しました！`);
      setRegName("");
      setRegPoints("");
      setRegEvent("");
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました。";
      setErrorMsg(message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || txPoints === "" || Number(txPoints) <= 0) {
      setErrorMsg("対象の参加者と1pt以上の数値を指定してください。");
      return;
    }

    setTxLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const pointChange = txType === "add" ? Number(txPoints) : -Number(txPoints);
    const defaultReason = txType === "add" ? "ポイント加算" : "ポイント消費";

    try {
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: selectedUserId,
          point_change: pointChange,
          event_name: txEvent || "ラキボ杯",
          reason: txReason || defaultReason,
        },
      ]);

      if (error) throw new Error(error.message);

      const targetUser = users.find((u) => u.id === selectedUserId);
      const actionText = txType === "add" ? `+${txPoints}pt 加算` : `-${txPoints}pt 消費`;
      setSuccessMsg(`${targetUser?.display_name} 様に ${actionText} しました！`);

      setTxPoints("");
      setTxEvent("");
      setTxReason("");
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "処理に失敗しました。";
      setErrorMsg(message);
    } finally {
      setTxLoading(false);
    }
  };

  const handleCopyUrl = (userId: string) => {
    const url = `${window.location.origin}/p/${userId}`;
    navigator.clipboard.writeText(url);
    alert("確認URLをコピーしました！");
  };

  const handleJumpToTx = (userId: string) => {
    handleSelectUser(userId);
    setActiveTab("transaction");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const filteredUsers = users.filter((u) =>
    u.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h1 className="text-lg font-bold text-slate-800 mb-4 text-center">
            運営管理画面 ログイン
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                運営用パスワード
              </label>
              <input
                type="password"
                placeholder="パスワードを入力"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>

            {passError && (
              <p className="text-red-600 text-xs font-bold bg-red-50 p-2 rounded">
                {passError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs shadow"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-800">ラキボリワード 運営管理</h1>
          <button
            onClick={() => {
              sessionStorage.removeItem("admin_authenticated");
              setIsAuthenticated(false);
            }}
            className="text-[10px] text-slate-500 hover:text-slate-800 underline"
          >
            ログアウト
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-slate-200 mb-6 text-[11px] sm:text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === "register"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ① 新規登録
          </button>
          <button
            onClick={() => {
              setActiveTab("transaction");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === "transaction"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ② 加算・消費
          </button>
          <button
            onClick={() => {
              setActiveTab("list");
              setErrorMsg("");
              setSuccessMsg("");
              fetchUsers();
            }}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === "list"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ③ 一覧・検索
          </button>
        </div>

        {/* メッセージ */}
        {errorMsg && (
          <div className="mb-4 text-red-600 text-xs bg-red-50 p-3 rounded border border-red-200">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 text-green-700 text-xs bg-green-50 p-3 rounded border border-green-200 font-bold">
            ✅ {successMsg}
          </div>
        )}

        {/* タブ① */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                大会名（任意）
              </label>
              <input
                type="text"
                value={regEvent}
                onChange={(e) => setRegEvent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                参加者名（表示名）<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                初回持ち越しポイント<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={regPoints}
                onChange={(e) =>
                  setRegPoints(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs shadow disabled:bg-slate-300"
            >
              {regLoading ? "登録中..." : "新規登録を実行"}
            </button>

            {createdUrl && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                <p className="font-bold text-slate-700 mb-1">発行された確認URL:</p>
                <input
                  type="text"
                  readOnly
                  value={createdUrl}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-slate-700 select-all text-[11px]"
                />
              </div>
            )}
          </form>
        )}

        {/* タブ② */}
        {activeTab === "transaction" && (
          <form onSubmit={handleTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                対象の参加者を選択<span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 bg-white"
              >
                <option value="">-- 選択してください --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>

            {currentPoints !== null && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-xs flex justify-between items-center">
                <span className="text-amber-900 font-bold">現在の持ち越しポイント:</span>
                <span className="text-base font-extrabold text-amber-600">
                  {currentPoints} pt
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                操作種別
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType("add")}
                  className={`flex-1 py-2 text-xs font-bold rounded border ${
                    txType === "add"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  ＋ ポイント加算
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("sub")}
                  className={`flex-1 py-2 text-xs font-bold rounded border ${
                    txType === "sub"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  － ポイント消費（利用）
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                変動ポイント数<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={txPoints}
                onChange={(e) =>
                  setTxPoints(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                大会名・イベント名（任意）
              </label>
              <input
                type="text"
                value={txEvent}
                onChange={(e) => setTxEvent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                理由・メモ（任意）
              </label>
              <input
                type="text"
                value={txReason}
                onChange={(e) => setTxReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={txLoading}
              className={`w-full py-2.5 text-white font-bold rounded text-xs shadow disabled:bg-slate-300 ${
                txType === "add"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {txLoading
                ? "処理中..."
                : txType === "add"
                ? "ポイントを加算する"
                : "ポイントを消費する"}
            </button>
          </form>
        )}

        {/* タブ③ */}
        {activeTab === "list" && (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="参加者名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900"
              />
            </div>

            {loadingUsers ? (
              <p className="text-center text-xs text-slate-500 py-4">読み込み中...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">
                該当する参加者が見つかりません。
              </p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const total =
                    u.transactions?.reduce((acc, t) => acc + t.point_change, 0) ?? 0;

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between gap-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-800">
                          {u.display_name}
                        </span>
                        <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          {total} pt
                        </span>
                      </div>

                      <div className="flex gap-2 text-xs pt-1">
                        <button
                          onClick={() => handleCopyUrl(u.id)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[11px]"
                        >
                          URLコピー
                        </button>
                        <button
                          onClick={() => handleJumpToTx(u.id)}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px]"
                        >
                          加算・消費
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}