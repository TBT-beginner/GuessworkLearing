
import React, { useEffect, useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { getAdminWhitelist } from '../services/storage';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
}

// ==================================================================================
// [CONFIGURATION REQUIRED]
// 1. Create a project at https://console.cloud.google.com/
// 2. Go to Credentials > Create Credentials > OAuth Client ID > Web Application
// 3. Add your current URL (see console.log) to "Authorized JavaScript origins"
// 4. Paste the Client ID below:
// ==================================================================================
const GOOGLE_CLIENT_ID = "398706543242-le68k4bdk5cjajtmdet4rqj0vsunkucu.apps.googleusercontent.com";

declare global {
  interface Window {
    google: any;
  }
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);

  const handleCredentialResponse = (response: any) => {
    try {
      // Decode the JWT token
      const idToken = response.credential;
      const payload = decodeJwt(idToken);

      if (!payload.email) {
        throw new Error("Email not found in Google account.");
      }

      // Check admin status
      const admins = getAdminWhitelist();
      const isAdmin = admins.includes(payload.email);

      const user: UserProfile = {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: isAdmin ? UserRole.ADMIN : UserRole.LEARNER,
        avatarUrl: payload.picture // Google profile picture
      };

      onLogin(user);
    } catch (err) {
      console.error("Login Error:", err);
      setError("Failed to verify Google Account. Please try again.");
    }
  };

  useEffect(() => {
    // HELPER: Log the current origin to help user configure Google Cloud
    console.log("⚠️ [Google Sign-In Setup] Add this URL to 'Authorized JavaScript origins':", window.location.origin);

    // Initialize Google Sign-In
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false, // Disable auto-select for better UX control
          cancel_on_tap_outside: false
        });

        // Render the Google Sign-In button
        const buttonContainer = document.getElementById('googleButtonDiv');
        if (buttonContainer) {
            window.google.accounts.id.renderButton(
                buttonContainer,
                { 
                    theme: 'outline', 
                    size: 'large', 
                    width: '100%', // Responsive width
                    text: 'signin_with',
                    shape: 'pill',
                }
            );
        }
      } catch (e) {
          console.error("GSI Error:", e);
      }
    } else {
        // Retry mechanism if script hasn't loaded yet
        const timer = setTimeout(() => {
             // Trigger re-render to try again
             setError(null); 
        }, 500);
        return () => clearTimeout(timer);
    }
  }, []);

  // Helper to properly decode JWT with UTF-8 support
  const decodeJwt = (token: string) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  const isConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID_HERE");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
           {/* Background decoration */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10">
               <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white,transparent)]"></div>
           </div>

           <div className="relative z-10">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <span className="font-bold text-4xl text-indigo-600">G</span>
                </div>
                <h1 className="text-3xl font-bold text-white">GuessWork Learning</h1>
                <p className="text-indigo-200 mt-3 text-lg font-medium">Institutional Access</p>
           </div>
        </div>
        
        <div className="p-10">
          <div className="space-y-6">
             <div className="text-center mb-6">
                 <p className="text-slate-600 text-lg">
                     Please sign in with your authorized Google Account to continue.
                 </p>
             </div>

             {!isConfigured ? (
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                     <div className="flex items-center gap-2 font-bold mb-2">
                         <AlertTriangle className="w-5 h-5" />
                         <span>Setup Required</span>
                     </div>
                     <p className="mb-2">
                         To enable Google Sign-In, you must provide a valid <code>GOOGLE_CLIENT_ID</code> in <code>components/LoginView.tsx</code>.
                     </p>
                     <p className="mt-2 font-mono text-xs bg-amber-100/50 p-2 rounded">
                        Check console (F12) for the correct URL to whitelist in Google Cloud.
                     </p>
                 </div>
             ) : (
                 <>
                    {/* Google Button Target */}
                    <div id="googleButtonDiv" className="flex justify-center h-[50px]"></div>

                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm text-center font-medium border border-rose-100">
                            {error}
                        </div>
                    )}
                 </>
             )}

             <div className="pt-6 border-t border-slate-100 text-center">
                 <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-full">
                     <ShieldCheck className="w-4 h-4" />
                     Secure Authentication
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
