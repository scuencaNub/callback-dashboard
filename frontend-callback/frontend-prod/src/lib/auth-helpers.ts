import { fetchAuthSession } from "aws-amplify/auth";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const BYPASS_TOKEN = "dev-bypass-token";

/**
 * Returns the current user's ID token string.
 * In bypass mode, returns a dummy token so API calls don't fail.
 */
export async function getIdToken(): Promise<string> {
    if (AUTH_BYPASS) {
        return BYPASS_TOKEN;
    }

    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();

    if (!idToken) {
        throw new Error("No authentication token available");
    }

    return idToken;
}

/**
 * Returns the current user's display name from the ID token.
 * In bypass mode, returns a dev placeholder.
 */
export async function getLoggedUserName(): Promise<string> {
    if (AUTH_BYPASS) {
        return "Dev User (bypass)";
    }

    try {
        const { tokens } = await fetchAuthSession();
        const payload = tokens?.idToken?.payload;
        const userName =
            String(payload?.name || "").trim() ||
            String(payload?.email || "").trim() ||
            String(payload?.["cognito:username"] || "").trim();
        return userName || "Unknown user";
    } catch {
        return "Unknown user";
    }
}
