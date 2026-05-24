// Translate raw Supabase / Postgres / Auth error messages into short,
// user-friendly messages so users understand what they did wrong.

type AnyErr = { message?: string; code?: string; status?: number } | string | null | undefined;

const RULES: { match: RegExp; msg: string }[] = [
  // Auth
  { match: /invalid login credentials/i, msg: "Email or password is incorrect." },
  { match: /email not confirmed/i, msg: "Please verify your email before signing in." },
  { match: /user already registered|already.*registered|duplicate.*email/i, msg: "An account with this email already exists." },
  { match: /password should be at least/i, msg: "Password is too short. Use at least 6 characters." },
  { match: /weak.?password|pwned|leaked/i, msg: "This password is too weak or has been leaked. Choose a stronger one." },
  { match: /rate limit|too many requests/i, msg: "Too many attempts. Please wait a moment and try again." },
  { match: /invalid.*email/i, msg: "Please enter a valid email address." },
  { match: /jwt expired|invalid jwt|not authenticated|no.*session/i, msg: "Your session expired. Please sign in again." },

  // Permissions / RLS
  { match: /row.?level security|permission denied|not allowed|unauthor/i, msg: "You don't have permission to do this." },

  // Constraints
  { match: /duplicate key|unique constraint|already exists/i, msg: "This already exists. Try a different value." },
  { match: /violates foreign key/i, msg: "Related record is missing or has been removed." },
  { match: /violates not.?null|null value in column/i, msg: "Please fill in all required fields." },
  { match: /value too long/i, msg: "One of your inputs is too long." },
  { match: /invalid input syntax|invalid.*format/i, msg: "Some of your input is not in the right format." },
  { match: /check constraint/i, msg: "Some of your input is not allowed." },

  // Storage
  { match: /payload too large|file.*too large|exceeded.*size/i, msg: "File is too large. Please upload a smaller one." },
  { match: /mime type|invalid.*file type|not.*allowed.*type/i, msg: "This file type isn't allowed." },
  { match: /bucket.*not.*found/i, msg: "Storage is misconfigured. Please contact support." },

  // Network
  { match: /failed to fetch|network|timeout|fetch failed/i, msg: "Network problem. Please check your connection and try again." },

  // App-specific (from triggers/functions)
  { match: /insufficient.*balance/i, msg: "You don't have enough balance for this action." },
  { match: /minimum.*withdraw/i, msg: "Amount is below the minimum withdrawal limit." },
  { match: /withdrawals.*disabled/i, msg: "Withdrawals are currently disabled by admin." },
  { match: /task.*total.*minimum|minimum.*task.*total/i, msg: "Task total (reward × slots) is below the minimum set by admin." },
  { match: /publisher.*restricted/i, msg: "Your publisher access is restricted." },
];

export function friendlyError(err: AnyErr, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const raw = typeof err === "string" ? err : (err.message ?? "");
  if (!raw) return fallback;

  for (const r of RULES) {
    if (r.match.test(raw)) return r.msg;
  }

  // If message looks like a technical / SQL / JSON dump, return generic fallback.
  if (/[{}]|::|\\bSQL\\b|relation .* does not exist|column .* does not exist/i.test(raw)) {
    return fallback;
  }

  // Otherwise return the original — it's likely already a human-written message
  // from one of our own toast.error() / RPC raise notice calls.
  return raw;
}
