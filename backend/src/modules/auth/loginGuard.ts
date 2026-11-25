/**
 * Chống dò mật khẩu: một tài khoản đăng nhập sai LOGIN_MAX_FAILS lần trong LOGIN_WINDOW_MS
 * thì bị tạm khóa LOGIN_LOCK_MS. Phần tính toán là hàm thuần để kiểm thử được,
 * trạng thái lưu trong bộ nhớ của backend (khởi động lại thì xóa).
 */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_LOCK_MS = 15 * 60_000;

export interface LoginAttempts {
  fails: number; // số lần sai trong cửa sổ hiện tại
  firstFailAt: number; // thời điểm sai lần đầu của cửa sổ
  lockedUntil?: number; // đang khóa đến thời điểm này
}

/** Còn bị khóa bao nhiêu mili giây (0 = không khóa) */
export function lockRemaining(a: LoginAttempts | undefined, now: number): number {
  if (!a?.lockedUntil) return 0;
  return Math.max(0, a.lockedUntil - now);
}

/** Ghi nhận một lần đăng nhập sai, trả về trạng thái mới */
export function registerFailure(a: LoginAttempts | undefined, now: number): LoginAttempts {
  // Hết khóa hoặc quá cửa sổ thời gian thì đếm lại từ đầu
  const fresh = !a || (a.lockedUntil !== undefined && a.lockedUntil <= now) || now - a.firstFailAt > LOGIN_WINDOW_MS;
  const next: LoginAttempts = fresh ? { fails: 1, firstFailAt: now } : { ...a, fails: a.fails + 1 };
  if (next.fails >= LOGIN_MAX_FAILS) next.lockedUntil = now + LOGIN_LOCK_MS;
  return next;
}

/** Số lần còn được thử trước khi bị khóa */
export function attemptsLeft(a: LoginAttempts | undefined): number {
  return Math.max(0, LOGIN_MAX_FAILS - (a?.fails ?? 0));
}

// ---- Lưu trạng thái theo tên đăng nhập ----
const store = new Map<string, LoginAttempts>();
const keyOf = (username: string) => username.trim().toLowerCase();

export const loginGuard = {
  remaining(username: string, now = Date.now()) {
    return lockRemaining(store.get(keyOf(username)), now);
  },
  fail(username: string, now = Date.now()) {
    const next = registerFailure(store.get(keyOf(username)), now);
    store.set(keyOf(username), next);
    return next;
  },
  success(username: string) {
    store.delete(keyOf(username));
  },
};

// Dọn các bản ghi cũ mỗi 30 phút để bộ nhớ không phình ra
setInterval(() => {
  const now = Date.now();
  for (const [k, a] of store) {
    if (lockRemaining(a, now) === 0 && now - a.firstFailAt > LOGIN_WINDOW_MS) store.delete(k);
  }
}, 30 * 60_000).unref();
