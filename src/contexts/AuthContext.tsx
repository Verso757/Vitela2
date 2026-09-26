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
import { doc, getDoc, setDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";

export type Role = "owner" | "doctor" | "assistant" | "admin" | "superadmin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  clinicId: string;
  originalClinicId?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  activeClinicId: string | null;
  activeClinicName: string | null;
  isImpersonating: boolean;
  switchClinic: (clinicId: string, clinicName?: string) => void;
  resetToMyClinic: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = [
  "jrafael.garcia757@gmail.com",
  "koferosgroup@gmail.com"
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedClinicId, setImpersonatedClinicId] = useState<string | null>(() => {
    return localStorage.getItem("vitela_impersonated_clinic_id") || null;
  });
  const [impersonatedClinicName, setImpersonatedClinicName] = useState<string | null>(() => {
    return localStorage.getItem("vitela_impersonated_clinic_name") || null;
  });

  const checkIsSuperAdmin = (email?: string | null) => {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.some(
      (adminEmail) => adminEmail.toLowerCase() === email.toLowerCase()
    );
  };

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
          const isTargetAdmin = checkIsSuperAdmin(firebaseUser.email);

          if (userDoc.exists()) {
            const data = userDoc.data();
            let finalRole = data.role as Role;

            if (isTargetAdmin && data.role !== "owner") {
              finalRole = "owner";
              await setDoc(userDocRef, { role: "owner" }, { merge: true });
            }

            const baseClinicId = data.clinicId || firebaseUser.uid;
            const currentEffectiveClinicId = (isTargetAdmin && impersonatedClinicId) ? impersonatedClinicId : baseClinicId;

            setUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || "Usuario",
              email: data.email || firebaseUser.email,
              role: isTargetAdmin ? "owner" : finalRole,
              clinicId: currentEffectiveClinicId,
              originalClinicId: baseClinicId,
              isSuperAdmin: isTargetAdmin,
              avatarInitials: data.name ? data.name.substring(0, 2).toUpperCase() : "DR"
            });
          } else {
            // New user! Check if a clinic was already pre-created for this email by SuperAdmin
            const userEmailClean = firebaseUser.email.toLowerCase();
            let assignedClinicId = firebaseUser.uid;
            let clinicName = `Clínica de ${firebaseUser.displayName || 'Doctor'}`;

            try {
              const matchedClinicsSnap = await getDocs(
                query(collection(db, "clinics"), where("contactEmail", "==", userEmailClean))
              );

              if (!matchedClinicsSnap.empty) {
                const matchedClinic = matchedClinicsSnap.docs[0];
                assignedClinicId = matchedClinic.id;
                clinicName = matchedClinic.data().name || clinicName;
              }
            } catch (err) {
              console.warn("Could not query pre-existing clinics by email:", err);
            }

            const batch = writeBatch(db);

            // If it's a completely new clinic, create it
            if (assignedClinicId === firebaseUser.uid) {
              const clinicRef = doc(db, "clinics", firebaseUser.uid);
              batch.set(clinicRef, {
                name: clinicName,
                ownerId: firebaseUser.uid,
                contactEmail: firebaseUser.email,
                doctorName: firebaseUser.displayName || "Doctor Titular",
                plan: "Pro",
                planStatus: "active",
                createdAt: new Date().toISOString()
              });
            }

            const memberRef = doc(db, "clinics", assignedClinicId, "members", firebaseUser.uid);
            batch.set(memberRef, {
              role: "owner",
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
            }, { merge: true });

            batch.set(userDocRef, {
              clinicId: assignedClinicId,
              role: "owner",
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
            }, { merge: true });

            await batch.commit();

            const currentEffectiveClinicId = (isTargetAdmin && impersonatedClinicId) ? impersonatedClinicId : assignedClinicId;

            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role: "owner",
              clinicId: currentEffectiveClinicId,
              originalClinicId: assignedClinicId,
              isSuperAdmin: isTargetAdmin,
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
  }, [impersonatedClinicId]);

  const switchClinic = (clinicId: string, clinicName?: string) => {
    localStorage.setItem("vitela_impersonated_clinic_id", clinicId);
    if (clinicName) {
      localStorage.setItem("vitela_impersonated_clinic_name", clinicName);
      setImpersonatedClinicName(clinicName);
    } else {
      setImpersonatedClinicName(null);
      localStorage.removeItem("vitela_impersonated_clinic_name");
    }
    setImpersonatedClinicId(clinicId);

    if (user) {
      setUser({
        ...user,
        clinicId: clinicId
      });
    }
  };

  const resetToMyClinic = () => {
    localStorage.removeItem("vitela_impersonated_clinic_id");
    localStorage.removeItem("vitela_impersonated_clinic_name");
    setImpersonatedClinicId(null);
    setImpersonatedClinicName(null);

    if (user && user.originalClinicId) {
      setUser({
        ...user,
        clinicId: user.originalClinicId
      });
    }
  };

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
    localStorage.removeItem("vitela_impersonated_clinic_id");
    localStorage.removeItem("vitela_impersonated_clinic_name");
    setImpersonatedClinicId(null);
    setImpersonatedClinicName(null);
    await signOut(auth);
  };

  const isSuperAdmin = user ? checkIsSuperAdmin(user.email) : false;
  const isImpersonating = Boolean(isSuperAdmin && impersonatedClinicId && impersonatedClinicId !== user?.originalClinicId);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      logout,
      isSuperAdmin,
      activeClinicId: user?.clinicId || null,
      activeClinicName: impersonatedClinicName,
      isImpersonating,
      switchClinic,
      resetToMyClinic
    }}>
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