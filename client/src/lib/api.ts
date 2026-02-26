const isServer = typeof window === "undefined";

export async function fetchWithAuthRetry(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (isServer) {
    throw new Error("fetchWithAuthRetry cannot be called on the server");
  }

  const res = await fetch(url, { ...options, credentials: "include" });

  if (res.status === 401) {
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      return fetch(url, { ...options, credentials: "include" });
    } else {
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }
  }

  return res;
}
