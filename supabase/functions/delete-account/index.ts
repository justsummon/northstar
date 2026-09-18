import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...corsHeaders,'Content-Type':'application/json'},
});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Метод не поддерживается.'},405);

  const authorization=req.headers.get('Authorization');
  if(!authorization)return json({error:'Нужна авторизация.'},401);

  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!anonKey||!serviceRoleKey){
    return json({error:'Сервер удаления аккаунта не настроен.'},500);
  }

  const userClient=createClient(supabaseUrl,anonKey,{
    global:{headers:{Authorization:authorization}},
    auth:{persistSession:false},
  });
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:'Сессия недействительна. Войдите снова.'},401);

  const adminClient=createClient(supabaseUrl,serviceRoleKey,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const {error:deleteError}=await adminClient.auth.admin.deleteUser(user.id);
  if(deleteError)return json({error:`Не удалось удалить аккаунт: ${deleteError.message}`},400);

  return json({success:true});
});
