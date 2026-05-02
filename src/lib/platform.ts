import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns the redirect URL to use for Supabase auth flows.
 * - On native (Capacitor) platforms: uses capacitor://localhost so the OAuth
 *   provider hands control back to the embedded webview.
 * - On the web: uses the provided web path on window.location.origin.
 */
export function getAuthRedirectUrl(webPath: string = "/dashboard"): string {
  if (isNative()) return "capacitor://localhost";
  if (typeof window !== "undefined") {
    return `${window.location.origin}${webPath}`;
  }
  return webPath;
}
