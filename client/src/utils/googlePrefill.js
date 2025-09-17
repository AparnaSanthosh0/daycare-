// Utility to fetch basic profile info from Google to pre-fill registration forms
// Tries popup first; falls back to redirect when popups are blocked. Also resolves any prior redirect result.
import firebase from '../config/firebase';

export async function prefillWithGoogle() {
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 1) If we are returning from a redirect, resolve it first
  try {
    const redirectResult = await auth.getRedirectResult();
    if (redirectResult && redirectResult.user) {
      const u = redirectResult.user;
      const profile = { email: u.email || '', displayName: u.displayName || '', photoURL: u.photoURL || '' };
      await auth.signOut();
      return { success: true, profile };
    }
  } catch (_) {
    // ignore
  }

  // 2) Try popup
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result?.user;
    const profile = {
      email: user?.email || '',
      displayName: user?.displayName || '',
      photoURL: user?.photoURL || ''
    };
    await auth.signOut();
    return { success: true, profile };
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    // 3) Fallback to redirect for popup issues (blocked/closed or internal assertion)
    if (
      code.includes('auth/popup-blocked') ||
      code.includes('auth/popup-closed-by-user') ||
      msg.includes('pending promise was never set')
    ) {
      try {
        await auth.signInWithRedirect(provider);
        return { success: false, message: 'Redirecting to Google...' };
      } catch (e) {
        return { success: false, message: e?.message || 'Google redirect failed' };
      }
    }
    return { success: false, message: error?.message || 'Google prefill failed' };
  }
}