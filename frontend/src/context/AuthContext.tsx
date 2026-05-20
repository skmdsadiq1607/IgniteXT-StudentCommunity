import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_ID = '94360984387-mtiosti1gvuglss445j0hqt34sfcf5fs.apps.googleusercontent.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ignitext_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the script is already loaded
    if (document.getElementById('google-gsi-client')) {
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setLoading(false);
    };
    script.onerror = () => {
      setLoading(false);
      console.error('Failed to load Google Identity Services SDK');
      toast.error('Google Sign-In service is temporarily unavailable.');
    };
    document.head.appendChild(script);
  }, []);

  const signInWithGoogle = async () => {
    if (typeof window === 'undefined' || !(window as any).google) {
      toast.error('Google Sign-In is still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Opening Google Sign-In...', {
      style: {
        background: '#18181b',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      },
    });

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid profile email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('OAuth token error:', tokenResponse.error);
            toast.error('Sign-in was not completed.', { id: toastId });
            setLoading(false);
            return;
          }

          try {
            // Fetch profile data directly using Google Userinfo API
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!res.ok) throw new Error('Failed to retrieve userinfo profile');

            const profile = await res.json();
            
            const userData: User = {
              uid: profile.sub,
              displayName: profile.name,
              email: profile.email,
              photoURL: profile.picture,
            };

            setUser(userData);
            localStorage.setItem('ignitext_user', JSON.stringify(userData));

            toast.success(`Welcome back, ${profile.given_name || profile.name}! 🚀`, {
              id: toastId,
              style: {
                background: '#18181b',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              },
            });
          } catch (fetchErr) {
            console.error('Error fetching Google profile:', fetchErr);
            toast.error('Failed to load your Google profile details.', { id: toastId });
          } finally {
            setLoading(false);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      console.error('Sign-in flow initiation failed:', err);
      toast.error('Failed to launch Google Sign-In popup.', { id: toastId });
      setLoading(false);
    }
  };

  const logout = async () => {
    const toastId = toast.loading('Signing out...', {
      style: {
        background: '#18181b',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      },
    });

    try {
      setUser(null);
      localStorage.removeItem('ignitext_user');
      toast.success('Signed out successfully!', {
        id: toastId,
        style: {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    } catch (err) {
      console.error('Sign-out error:', err);
      toast.error('Sign out failed.', { id: toastId });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
