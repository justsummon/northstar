import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers':'X-Northstar-AI-Mode',
};
const encoder=new TextEncoder();
const GEMINI_MODEL='gemini-2.5-flash';
const GEMINI_TIMEOUT_MS=30000;

function jsonError(error:string,status:number){
  return new Response(JSON.stringify({error}),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}

function value(value:any,fallback='не указан'){
  return value===null||value===undefined||value===''?fallback:String(value);
}

function universityGaps(profile:any,shortlist:any[]){
  if(!shortlist.length)return ['Шортлист пуст — добавь 2–4 вуза, чтобы сравнить профиль с конкретными требованиями.'];
  return shortlist.slice(0,4).map(row=>{
    const university=row.universities||{};
    const gaps:string[]=[];
    const compare=(label:string,current:any,required:any)=>{
      if(required==null)return;
      if(current==null)gaps.push(`${label} не заполнен; ориентир вуза — ${required}`);
      else{
        const difference=Number(required)-Number(current);
        gaps.push(difference>0?`${label}: не хватает примерно ${Number(difference.toFixed(2))} до ориентира ${required}`:`${label}: текущий результат ${current} не ниже ориентира ${required}`);
      }
    };
    compare('GPA',profile.gpa_unweighted,university.gpa_requirement);
    compare('SAT',profile.sat,university.sat_requirement);
    compare('ACT',profile.act,university.act_requirement);
    compare('NUET',profile.nuet,university.nuet_requirement);
    return `• ${university.name}: ${gaps.length?gaps.join('; '):'числовые пороги не заполнены — проверь официальную страницу программы'}.`;
  });
}

function missingSections(profile:any,activities:any[],olympiads:any[],apExams:any[],shortlist:any[]){
  const missing:string[]=[];
  if(!String(profile.target_major||'').trim())missing.push('указать Major / Spike');
  if(profile.gpa_unweighted==null)missing.push('добавить GPA и шкалу');
  if(profile.english_score==null)missing.push('добавить IELTS/TOEFL или диагностический результат');
  if(profile.sat==null&&profile.act==null&&profile.nuet==null)missing.push('добавить хотя бы один релевантный вступительный тест');
  if(!activities.length)missing.push('описать 1–3 активности с ролью, результатом и часами');
  if(!apExams.length&&profile.ib_score==null)missing.push('заполнить AP/IB, если они доступны');
  if(!olympiads.length)missing.push('добавить awards/олимпиады или честно оставить раздел пустым');
  if(!Array.isArray(profile.recommendation_letters)||!profile.recommendation_letters.length)missing.push('зафиксировать статус рекомендательных писем');
  if(!String(profile.narrative_about_me||'').trim())missing.push('написать 3–5 предложений о связности профиля');
  if(!shortlist.length)missing.push('собрать шортлист из 2–4 вузов');
  return missing;
}

function essayTemplate(message:string){
  const text=message.toLowerCase();
  if(/why (this|us|college|university)|почему.*(вуз|университет)|why school/.test(text))return{
    title:'«Почему этот вуз»',
    structure:[
      '1. Конкретная академическая цель — чему именно ты хочешь научиться.',
      '2. Два проверяемых ресурса вуза: курс, лаборатория, профессор, клуб или программа.',
      '3. Связь этих ресурсов с твоим уже существующим опытом.',
      '4. Какой вклад ты сможешь внести в сообщество.',
    ],
    checklist:['Нет общих фраз про престиж и рейтинг','Каждый факт можно проверить на сайте вуза','Текст нельзя без изменений отправить в другой университет'],
  };
  if(/identity|идентичност|культур|background|происхожд/.test(text))return{
    title:'Common App — идентичность / background',
    structure:['1. Одна сцена, где твоя идентичность проявилась в действии.','2. Конкретный выбор или конфликт.','3. Что изменилось в твоём понимании себя.','4. Как этот опыт влияет на твои решения сейчас.'],
    checklist:['Есть личная сцена, а не энциклопедическое описание','Нет попытки говорить за целую культуру','Финал показывает развитие'],
  };
  if(/challenge|obstacle|failure|испытан|сложност|неудач/.test(text))return{
    title:'Common App — испытание / неудача',
    structure:['1. Сцена до проблемы — что было поставлено на карту.','2. Твоя конкретная ошибка или препятствие.','3. Действия, а не только эмоции.','4. Изменение метода, привычки или взгляда.','5. Где новый подход уже дал результат.'],
    checklist:['Ты берёшь ответственность за свою часть','Главный акцент на реакции и росте','Вывод подтверждён новым действием'],
  };
  if(/activity|impact|community|активност|вклад|сообществ/.test(text))return{
    title:'Активность / вклад в сообщество',
    structure:['1. Проблема, которую ты заметил.','2. Почему она стала личной.','3. Что именно ты сделал.','4. Измеримый результат и ограничения.','5. Что бы ты сделал иначе во второй версии.'],
    checklist:['Есть твоя роль, а не только роль команды','Есть масштаб или измеримый результат','Показана рефлексия, а не резюме'],
  };
  return{
    title:'Универсальный personal statement',
    structure:['1. Открывающая конкретная сцена.','2. Вопрос или напряжение, которое двигало историю.','3. Два действия, показывающих твой характер.','4. Измеримый или наблюдаемый результат.','5. Рефлексия и связь с будущим Major / Spike.'],
    checklist:['Первый абзац нельзя заменить биографической справкой','Каждый абзац содержит действие или наблюдение','Достижения не перечисляются списком','Финал добавляет новый смысл, а не повторяет начало'],
  };
}

function essayResponse(message:string,profile:any,activities:any[],olympiads:any[],apExams:any[]){
  const template=essayTemplate(message);
  const major=value(profile.target_major,'выбранный Major / Spike');
  const strongestActivity=activities[0]?.name||'самую содержательную активность';
  const strongestAward=olympiads[0]?.name;
  const words=message.trim().split(/\s+/).filter(Boolean).length;
  const draftSignals:string[]=[];
  if(words>80){
    if(!/\d/.test(message))draftSignals.push('добавь одно конкретное число, срок или измеримый результат');
    if(/i have always|с детства я всегда|всегда мечтал/i.test(message))draftSignals.push('замени общее вступление на конкретную сцену');
    if(!/(понял|измени|науч|realized|learned|changed)/i.test(message))draftSignals.push('усиль рефлексию: что именно изменилось в твоём подходе');
  }
  return [
    `Шаблон: ${template.title}`,
    `Фокус профиля: ${major}. В качестве материала сначала проверь «${strongestActivity}»${strongestAward?` и опыт «${strongestAward}»`:''}.`,
    '',
    ...template.structure,
    '',
    'Чеклист перед следующей версией:',
    ...template.checklist.map(item=>`□ ${item}`),
    ...(draftSignals.length?['',`В присланном тексте около ${words} слов. Что улучшить:`,...draftSignals.map(item=>`• ${item}`)]:[]),
    '',
    'Следующий шаг: напиши 5–7 предложений только про одну сцену. Не добавляй факты, которых нет в портфолио.',
  ].join('\n');
}

function strategyResponse(profile:any,activities:any[],olympiads:any[],apExams:any[],shortlist:any[],events:any[]){
  const gaps=universityGaps(profile,shortlist);
  const missing=missingSections(profile,activities,olympiads,apExams,shortlist);
  const upcoming=events.filter(event=>!event.completed).slice(0,3);
  return [
    `Текущий фокус: ${value(profile.target_major,'Major / Spike пока не выбран')}.`,
    `Профиль: GPA ${value(profile.gpa_unweighted)}, SAT ${value(profile.sat)}, ACT ${value(profile.act)}, NUET ${value(profile.nuet)}, English ${value(profile.english_score)}; активностей — ${activities.length}, AP — ${apExams.length}, awards — ${olympiads.length}.`,
    '',
    'Разрывы до требований шортлиста:',
    ...gaps,
    '',
    'Что ещё не заполнено:',
    ...(missing.length?missing.slice(0,5).map(item=>`□ ${item}`):['✓ Базовые разделы заполнены; теперь улучшай качество доказательств и связность.']),
    '',
    'Ближайшие действия:',
    ...(upcoming.length?upcoming.map(event=>`• До ${event.date}: ${event.title}`):['• Пересчитай roadmap после обновления профиля и шортлиста.']),
    '',
    'Важно: это ориентировочное сравнение. Официальные требования и test-optional policy перепроверь на сайте конкретной программы.',
  ].join('\n');
}

function fallback(message:string,context:{profile:any;activities:any[];olympiads:any[];apExams:any[];shortlist:any[];events:any[]}){
  if(/essay|эссе|personal statement|common app|supplement|мотивац|prompt/i.test(message))return essayResponse(message,context.profile,context.activities,context.olympiads,context.apExams);
  return strategyResponse(context.profile,context.activities,context.olympiads,context.apExams,context.shortlist,context.events);
}

function chunkStream(answer:string,onDone:()=>Promise<void>){
  const chunks=answer.match(/.{1,36}(?:\s|$)/g)||[answer];
  return new ReadableStream({
    async start(controller){
      for(const chunk of chunks){controller.enqueue(encoder.encode(chunk));await new Promise(resolve=>setTimeout(resolve,12))}
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
      supabase.from('shortlist').select('universities(name,country,qs_rank,gpa_requirement,sat_requirement,act_requirement,nuet_requirement,other_requirements)').eq('profile_id',profile.id),
      supabase.from('calendar_events').select('title,date,type,source,completed').eq('profile_id',profile.id).order('date').limit(30),
    ]);
    const context={profile,activities:activities||[],olympiads:olympiads||[],apExams:apExams||[],shortlist:shortlist||[],events:events||[]};

    const {error:userMessageError}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'user',content:cleanMessage});
    if(userMessageError)throw userMessageError;

    const safeProfile={
      grade:profile.grade,target_major:profile.target_major,gpa_unweighted:profile.gpa_unweighted,gpa_weighted:profile.gpa_weighted,gpa_scale:profile.gpa_scale,
      english_exam_type:profile.english_exam_type,english_score:profile.english_score,sat:profile.sat,act:profile.act,ent_unt:profile.ent_unt,nuet:profile.nuet,
      ib_score:profile.ib_score,interview_ready:profile.interview_ready,target_countries:profile.target_countries,
    };
    const system=`Ты — AI-ассистент Northstar. Не выдумывай достижения, требования или дедлайны и не обещай поступление. Для эссе сохраняй голос автора; для стратегии давай 2–4 конкретных шага. Минимизированный профиль: ${JSON.stringify(safeProfile)}. Активности: ${JSON.stringify(context.activities)}. Олимпиады: ${JSON.stringify(context.olympiads)}. AP: ${JSON.stringify(context.apExams)}. Шортлист: ${JSON.stringify(context.shortlist)}. Roadmap: ${JSON.stringify(context.events)}.`;

    let answer=fallback(cleanMessage,context);
    let mode='fallback';
    const apiKey=Deno.env.get('GEMINI_API_KEY');

    if(apiKey){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),GEMINI_TIMEOUT_MS);
      try{
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,{
          method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
          body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:cleanMessage}]}],generationConfig:{temperature:0.45,maxOutputTokens:1400}}),
        });
        if(response.ok){
          const payload=await response.json();
          const generated=payload.candidates?.[0]?.content?.parts?.map((part:{text?:string})=>part.text||'').join('').trim();
          if(generated){answer=generated;mode='gemini'}
        }else console.error('Gemini fallback',response.status,await response.text());
      }catch(error){
        console.error('Gemini unavailable, using fallback',error);
      }finally{
        clearTimeout(timeout);
      }
    }

    const save=async()=>{
      const {error}=await supabase.from('ai_chat_messages').insert({user_id:user.id,role:'assistant',content:answer});
      if(error)console.error(error.message);
    };
    return new Response(chunkStream(answer,save),{headers:{...corsHeaders,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Northstar-AI-Mode':mode}});
  }catch(error){
    console.error(error);
    return jsonError(error instanceof Error?error.message:'Не удалось получить ответ.',400);
  }
});
