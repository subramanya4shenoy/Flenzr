// Bump only when intentionally retiring incompatible test data.
const DATA_VERSION = "fresh-2026-10-20";
const VERSION_KEY = "flenzr_data_version";

export function clearLocalAccountData() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("flenzr_") && key !== "flenzr_locale" && key !== VERSION_KEY) {
      localStorage.removeItem(key);
    }
  }
}

export function migrateLocalData() {
  if (localStorage.getItem(VERSION_KEY) === DATA_VERSION) return;
  clearLocalAccountData();
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("flenzr_")) sessionStorage.removeItem(key);
  }
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
}

export function selectLocalAccount(email: string) {
  if (localStorage.getItem("flenzr_account_email") !== email.toLowerCase()) {
    clearLocalAccountData();
  }
  localStorage.setItem("flenzr_account_email", email.toLowerCase());
}
