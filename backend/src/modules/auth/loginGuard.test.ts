import { describe, expect, it } from "vitest";
import { LOGIN_LOCK_MS, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, attemptsLeft, lockRemaining, registerFailure, type LoginAttempts } from "./loginGuard";

const MIN = 60_000;
const failTimes = (times: number[]) => times.reduce<LoginAttempts | undefined>((a, t) => registerFailure(a, t), undefined);

describe("Chống dò mật khẩu", () => {
  it("sai 4 lần chưa bị khóa, còn 1 lần thử", () => {
    const a = failTimes([0, 1, 2, 3].map((i) => i * MIN));
    expect(lockRemaining(a, 4 * MIN)).toBe(0);
    expect(attemptsLeft(a)).toBe(1);
  });

  it(`sai ${LOGIN_MAX_FAILS} lần trong 15 phút thì khóa 15 phút`, () => {
    const a = failTimes([0, 1, 2, 3, 4].map((i) => i * MIN));
    expect(lockRemaining(a, 4 * MIN)).toBe(LOGIN_LOCK_MS);
    expect(lockRemaining(a, 4 * MIN + LOGIN_LOCK_MS)).toBe(0);
  });

  it("các lần sai cách nhau quá 15 phút thì đếm lại từ đầu", () => {
    const a = failTimes([0, 1, 2, 3].map((i) => i * MIN).concat(LOGIN_WINDOW_MS + 5 * MIN));
    expect(a?.fails).toBe(1);
    expect(lockRemaining(a, LOGIN_WINDOW_MS + 5 * MIN)).toBe(0);
  });

  it("hết thời gian khóa, sai tiếp thì bắt đầu đếm lại", () => {
    const locked = failTimes([0, 1, 2, 3, 4].map((i) => i * MIN));
    const after = registerFailure(locked, 4 * MIN + LOGIN_LOCK_MS + 1);
    expect(after.fails).toBe(1);
    expect(lockRemaining(after, 4 * MIN + LOGIN_LOCK_MS + 1)).toBe(0);
  });
});
