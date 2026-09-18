import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {supabase,supabaseConfigured} from '../lib/supabase';

const AuthContext=createContext(null);

export function AuthProvider({children}){
 const [session,setSession]=useState(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!supabaseConfigured){setLoading(false);return}
  supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});
  return()=>subscription.unsubscribe();
 },[]);
 const value=useMemo(()=>({session,user:session?.user||null,loading,configured:supabaseConfigured,
  signIn:(email,password)=>supabase.auth.signInWithPassword({email,password}),
  signUp:(email,password,fullName)=>supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}}),
  resetPassword:(email)=>supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`}),
  updatePassword:(newPassword)=>supabase.auth.updateUser({password:newPassword}),
  signOut:()=>supabase.auth.signOut()
 }),[session,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext);
