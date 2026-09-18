import React from 'react';
import {createRoot} from 'react-dom/client';
import {CircleAlert} from 'lucide-react';
import App from './App';
import './styles.css';
import './mobile-nav.css';

class ErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={hasError:false}}
 static getDerivedStateFromError(){return {hasError:true}}
 render(){
  if(this.state.hasError)return <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center p-6"><div className="panel p-8 max-w-md text-center"><CircleAlert size={42} className="mx-auto text-[#e76443]"/><h1 className="display text-4xl mt-5">Что-то пошло не так.</h1><p className="muted mt-3">Обнови страницу. Если ошибка повторяется, проверь подключение Supabase.</p><button className="btn-primary mt-6" onClick={()=>window.location.reload()}>Обновить</button></div></div>;
  return this.props.children;
 }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
