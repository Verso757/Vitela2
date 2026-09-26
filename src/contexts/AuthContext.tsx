import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, db } from "../lib/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

export type Role = "owner" | "doctor" | "assistant" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  clinicId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process redirect result if coming back from signInWithRedirect
    getRedirectResult(auth).catch((err) => {
      console.warn("getRedirectResult info/error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            let finalRole = data.role as Role;
            const ADMIN_EMAILS = [
              "jrafael.garcia757@gmail.com",
              "koferosgroup@gmail.com"
            ];
            const isTargetAdmin = ADMIN_EMAILS.some(
              (adminEmail) => adminEmail.toLowerCase() === (data.email || "").toLowerCase()
            );

            if (isTargetAdmin && data.role !== "owner") {
              finalRole = "owner";
              await setDoc(userDocRef, { role: "owner" }, { merge: true });
            }
            setUser({
              id: firebaseUser.uid,
              name: data.name,
              email: data.email,
              role: isTargetAdmin ? "owner" : finalRole,
              clinicId: data.clinicId,
              avatarInitials: data.name ? data.name.substring(0, 2).toUpperCase() : "DR"
            });
          } else {
            // New user! Create a clinic for them and set them as owner.
            const batch = writeBatch(db);
            
            const clinicRef = doc(db, "clinics", firebaseUser.uid); // Use uid as clinic id for simplicity for single-owner clinics
            batch.set(clinicRef, {
              name: `Clínica de ${firebaseUser.displayName || 'Doctor'}`,
              ownerId: firebaseUser.uid,
              contactEmail: firebaseUser.email
            });

            const memberRef = doc(db, "clinics", firebaseUser.uid, "members", firebaseUser.uid);
            batch.set(memberRef, {
              role: "owner",
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
            });

            batch.set(userDocRef, {
              clinicId: firebaseUser.uid,
              role: "owner",
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
            });

            await batch.commit();

            setUser({
               id: firebaseUser.uid,
               name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
               email: firebaseUser.email,
               role: "owner",
               clinicId: firebaseUser.uid,
               avatarInitials: (firebaseUser.displayName || firebaseUser.email).substring(0, 2).toUpperCase()
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // Check if running in a standalone PWA or mobile browser where popups might fail
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Firebase auth error:", error);
      // If popup was blocked or in standalone PWA, attempt redirect
      if (error.code === "auth/popup-blocked" || (isStandalone && error.code === "auth/cancelled-popup-request")) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          throw redirectErr;
        }
      }
      // Rethrow original error with intact error.code and details
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}