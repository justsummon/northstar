import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const encoder=new TextEncoder();
const GEMINI_MODEL='gemini-2.5-flash';
const GEMINI_TIMEOUT_MS=30000;

function jsonError(error:string,status:number){
  return new Response(JSON.stringify({error}),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}

function fallback(message:string,profile:any,shortlist:any[],events:any[],apExams:any[]){
  const major=profile?.target_major||'выбранное направление';
  const universityNames=shortlist.map(x=>x.universities?.name).filter(Boolean).join(', ');
  if(/essay|эссе|personal statement|мотивац/i.test(message)){
    return `Начнём со структуры под ${major}: 1) конкретная сцена, 2) твой выбор или действие, 3) измеримый результат, 4) связь с будущей учёбой. Не перечисляй достижения — выбери один эпизод и покажи изменение. Пришли черновик или ответь: какой проект лучше всего показывает твой интерес к ${major}?`;
  }
  return `Для стратегии под ${major}${universityNames?` и шортлист ${universityNames}`:''} начни с ближайших доказуемых шагов. Сейчас в календаре ${events.length} событий и заполнено ${apExams.length} AP-экзаменов. Сверяй тесты и дедлайны по официальным источникам и усиливай один связный Major / Spike.`;
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
  if(req.method!=='POST')return jsonError('Метод не поддерживается.',405);

  try{
    const authorization=req.headers.get('Authorization')||'';
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return jsonError('Нужна авторизация.',401);

    const {message}=await req.json();
    const cleanMessage=String(message||'').trim().slice(0,12000);
    if(!cleanMessage)return jsonError('Сообщение пустое.',400);

    const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
    if(!profile)throw new Error('Профиль не найден.');

    const [{data:activities},{data:olympiads},{data:apExams},{data:shortlist},{data:events}]=await Promise.all([
      supabase.from('activities').select('name,tier,hours_per_week').eq('profile_id',profile.id),
      supabase.from('olympiads').select('name,level,result').eq('profile_id',profile.id),
      supabase.from('ap_exams').select('subject,score').eq('profile_id',profile.id),
      supabase.from('shortlist').select('universities(name,country,qs_rank,other_requirements)').eq('profile_id',profile.id),
      supabase.from('calendar_events').select('title,date,type,source,completed').eq('profile_id',profile.id).gte('date',new Date().toISOString().slice(0,10)).order('date').limit(20),
    ]);

    const {error:userMessageError}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'user',content:cleanMessage});
    if(userMessageError)throw userMessageError;

    const safeProfile={
      grade:profile.grade,
      target_major:profile.target_major,
      gpa_unweighted:profile.gpa_unweighted,
      gpa_weighted:profile.gpa_weighted,
      gpa_scale:profile.gpa_scale,
      english_exam_type:profile.english_exam_type,
      english_score:profile.english_score,
      sat:profile.sat,
      act:profile.act,
      ent_unt:profile.ent_unt,
      nuet:profile.nuet,
      ib_score:profile.ib_score,
      interview_ready:profile.interview_ready,
      target_countries:profile.target_countries,
    };

    const system=`Ты — AI-ассистент Northstar для старшеклассника. Помогай только с эссе и стратегией поступления. Используй факты профиля, но не выдумывай достижения, требования или дедлайны. Не обещай поступление. Для эссе сначала помогай найти личный эпизод и голос автора, затем редактируй; не выдавай полностью сфабрикованное эссе за пользователя. Для стратегии давай 2–4 конкретных следующих шага и отмечай, что официальные требования нужно перепроверять. Минимизированный профиль: ${JSON.stringify(safeProfile)}. Активности: ${JSON.stringify(activities||[])}. Олимпиады: ${JSON.stringify(olympiads||[])}. AP экзамены: ${JSON.stringify(apExams||[])}. Шортлист: ${JSON.stringify(shortlist||[])}. Roadmap: ${JSON.stringify(events||[])}.`;

    let answer=fallback(cleanMessage,profile,shortlist||[],events||[],apExams||[]);
    const apiKey=Deno.env.get('GEMINI_API_KEY');

    if(apiKey){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),GEMINI_TIMEOUT_MS);
      let response:Response;
      try{
        response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            systemInstruction:{parts:[{text:system}]},
            contents:[{role:'user',parts:[{text:cleanMessage}]}],
            generationConfig:{temperature:0.45,maxOutputTokens:1400},
          }),
          signal:controller.signal,
        });
      }catch(error){
        clearTimeout(timeout);
        if(error instanceof DOMException&&error.name==='AbortError')return jsonError('Gemini не успел ответить. Попробуй ещё раз через минуту.',504);
        return jsonError('Не удалось связаться с Gemini. Попробуй ещё раз.',502);
      }
      clearTimeout(timeout);

      if(!response.ok){
        console.error('Gemini API error',response.status,await response.text());
        if(response.status===429)return jsonError('Бесплатная квота Gemini временно исчерпана. Попробуй позже.',429);
        if(response.status===401||response.status===403)return jsonError('Gemini не настроен: проверь серверный GEMINI_API_KEY.',503);
        return jsonError('Gemini временно недоступен. Попробуй ещё раз.',502);
      }

      const payload=await response.json();
      const generated=payload.candidates?.[0]?.content?.parts?.map((part:{text?:string})=>part.text||'').join('').trim();
      if(generated)answer=generated;
    }

    const save=async()=>{
      const {error}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'assistant',content:answer});
      if(error)console.error(error.message);
    };
    return new Response(chunkStream(answer,save),{headers:{...corsHeaders,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'}});
  }catch(error){
    console.error(error);
    return jsonError(error instanceof Error?error.message:'Не удалось получить ответ.',400);
  }
});
