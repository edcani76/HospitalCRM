import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, onAuthStateChanged, db, doc, getDoc } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        console.log("AuthContext: Attempting to fetch user doc for UID:", firebaseUser.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          console.log("AuthContext: Successfully fetched user doc. Exists?", userDoc.exists());
          if (userDoc.exists()) {
            setUser({ ...userDoc.data(), uid: firebaseUser.uid } as UserProfile);
          } else {
            // Fallback if document doesn't exist yet
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'client',
              createdAt: new Date().toISOString()
            };
            setUser(newUser);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user doc:", error);
          setUser(null); // Set to null so the app doesn't crash completely
        }
      } else {
        console.log("AuthContext: No firebaseUser found, setting user to null.");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
