import { createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
}

export const AuthContext = createContext<AuthContextType>({ user: null, session: null });
export const useAuth = () => useContext(AuthContext);
