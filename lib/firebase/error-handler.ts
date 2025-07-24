/**
 * Converts Firebase error codes to user-friendly messages
 */
export function getFirebaseErrorMessage(error: any): string {
  const errorCode = error?.code || error?.message || '';
  
  // Common Firebase Auth error codes
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please use a different email or try logging in.';
    
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password with at least 6 characters.';
    
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled. Please contact support.';
    
    case 'auth/invalid-action-code':
      return 'The verification link is invalid or has expired.';
    
    case 'auth/expired-action-code':
      return 'The verification link has expired. Please request a new one.';
    
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in popup is allowed at a time.';
    
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
    
    // Firestore errors
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    
    case 'unavailable':
      return 'Service is currently unavailable. Please try again later.';
    
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    
    // Generic errors
    default:
      // Check if the error message contains Firebase-specific patterns
      if (typeof error === 'string' && error.includes('Firebase: Error')) {
        // Extract the error code from Firebase error message
        const match = error.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          return getFirebaseErrorMessage({ code: match[1] });
        }
      }
      
      // Fallback for unknown errors
      return 'An unexpected error occurred. Please try again later.';
  }
}
