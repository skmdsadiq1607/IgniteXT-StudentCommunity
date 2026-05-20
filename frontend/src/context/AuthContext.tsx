import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    const toastId = toast.loading('Signing in with Google...', {
      style: {
        background: '#18181b',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      },
    });
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!', {
        id: toastId,
        icon: '🚀',
        style: {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    } catch (error: any) {
      console.error('Sign-in error:', error);
      let errorMessage = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed.';
      }
      toast.error(errorMessage, {
        id: toastId,
        style: {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    } finally {
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
      await signOut(auth);
      toast.success('Signed out successfully!', {
        id: toastId,
        style: {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    } catch (error) {
      console.error('Sign-out error:', error);
      toast.error('Failed to sign out. Please try again.', {
        id: toastId,
        style: {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
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
