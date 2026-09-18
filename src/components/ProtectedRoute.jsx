import React from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function ProtectedRoute({children}){
 const {user,loading}=useAuth();const location=useLocation();
 if(loading)return <div className="app-loader"><span className="logo-mark">✦</span><p>Проверяем сессию…</p></div>;
 return user?children:<Navigate to="/login" replace state={{from:location.pathname}}/>;
}
