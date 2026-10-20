export async function startGoogleLogin(role: "creator" | "brand", signup = false) {
  const response = await fetch("/api/auth/google", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, signup }),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Could not start Google sign-in");
  window.location.assign(data.url);
}
