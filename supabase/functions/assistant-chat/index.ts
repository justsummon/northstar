import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const encoder=new TextEncoder();

function fallback(message:string,profile:any,shortlist:any[],events:any[]){
  const major=profile?.target_major||'выбранное направление';
  const universityNames=shortlist.map(x=>x.universities?.name).filter(Boolean).join(', ');
  if(/essay|эссе|personal statement|мотивац/i.test(message)){
    return `Начнём с сильной структуры под ${major}: 1) конкретная сцена, 2) твой выбор или действие, 3) измеримый результат, 4) как это связано с будущей учёбой. Не перечисляй достижения — выбери один эпизод и покажи изменение. Пришли черновик или ответь: какой проект лучше всего показывает твой интерес к ${major}?`;
  }
  return `Для стратегии под ${major}${universityNames?` и шортлист ${universityNames}`:''} я бы начал с ближайших доказуемых шагов. Сейчас в календаре ${events.length} событий. Выбери 2–4 приоритетных вуза, сверяй тесты и дедлайны по официальным источникам и усиливай один связный Major / Spike. Напиши, что важнее прямо сейчас: shortlist, тесты, активности или план эссе?`;
}

function chunkStream(answer:string,onDone:()=>Promise<void>){
  const chunks=answer.match(/.{1,28}(?:\s|$)/g)||[answer];
  return new ReadableStream({
    async start(controller){
      for(const chunk of chunks){controller.enqueue(encoder.encode(chunk));await new Promise(resolve=>setTimeout(resolve,18))}
      await onDone();
      controller.close();
    }
  });
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return new Response(JSON.stringify({error:'Метод не поддерживается.'}),{status:405,headers:{...corsHeaders,'Content-Type':'application/json'}});
  try{
    const authorization=req.headers.get('Authorization')||'';
    const supabaseUrl=Deno.env.get('SUPABASE_URL')!;
    const supabase=createClient(supabaseUrl,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return new Response(JSON.stringify({error:'Нужна авторизация.'}),{status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
    const {message}=await req.json();
    const cleanMessage=String(message||'').trim().slice(0,12000);
    if(!cleanMessage)return new Response(JSON.stringify({error:'Сообщение пустое.'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});

    const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
    if(!profile)throw new Error('Профиль не найден.');
    const [{data:activities},{data:olympiads},{data:shortlist},{data:events},{data:history}]=await Promise.all([
      supabase.from('activities').select('name,tier,hours_per_week,description').eq('profile_id',profile.id),
      supabase.from('olympiads').select('name,level,result').eq('profile_id',profile.id),
      supabase.from('shortlist').select('universities(name,country,qs_rank,other_requirements)').eq('profile_id',profile.id),
      supabase.from('calendar_events').select('title,date,type,source').eq('profile_id',profile.id).gte('date',new Date().toISOString().slice(0,10)).order('date').limit(20),
      supabase.from('ai_chat_messages').select('role,content').eq('user_id',user.id).order('created_at',{ascending:false}).limit(12),
    ]);
    const {error:userMessageError}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'user',content:cleanMessage});
    if(userMessageError)throw userMessageError;

    const system=`Ты — AI-ассистент Northstar для старшеклассника. Помогай только с эссе и стратегией поступления. Используй факты профиля, но не выдумывай достижения, требования или дедлайны. Не обещай поступление. Для эссе сначала помогай найти личный эпизод и голос автора, затем редактируй; не выдавай полностью сфабрикованное эссе за пользователя. Для стратегии давай 2–4 конкретных следующих шага и отмечай, что официальные требования нужно перепроверять. Профиль: ${JSON.stringify(profile)}. Активности: ${JSON.stringify(activities||[])}. Олимпиады: ${JSON.stringify(olympiads||[])}. Шортлист: ${JSON.stringify(shortlist||[])}. Roadmap: ${JSON.stringify(events||[])}.`;
    let answer=fallback(cleanMessage,profile,shortlist||[],events||[]);
    const apiKey=Deno.env.get('ANTHROPIC_API_KEY');
    if(apiKey){
      const messages=[...(history||[]).reverse(),{role:'user',content:cleanMessage}];
      const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-3-5-haiku-latest',max_tokens:1200,system,messages})});
      if(response.ok){const payload=await response.json();answer=String(payload.content?.[0]?.text||answer)}
    }
    const save=async()=>{const {error}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'assistant',content:answer});if(error)console.error(error.message)};
    return new Response(chunkStream(answer,save),{headers:{...corsHeaders,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'}});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Не удалось получить ответ.'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
