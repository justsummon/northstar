import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

type Profile={id:string;target_major:string;gpa_unweighted:number|null;gpa_scale:number;english_score:number|null;sat:number|null;nuet:number|null;interview_ready:boolean;target_countries:string[]};

const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const text=(value:unknown)=>typeof value==='string'?value:'';

function fallback(profile:Profile,university:any,activities:any[],olympiads:any[],ap:any[]){
  const major=profile.target_major.toLowerCase();
  const evidence=[...activities.map(x=>`${x.name} ${x.description}`),...olympiads.map(x=>x.name),...ap.map(x=>x.subject)].join(' ').toLowerCase();
  const keywords=major.includes('computer')||major.includes('data')?['code','program','robot','math','ai','data','research']:major.includes('econom')?['econom','business','finance','market','debate']:['research','project','olympiad'];
  const aligned=keywords.some(k=>evidence.includes(k));
  const gpaRatio=Number(profile.gpa_unweighted||0)/Number(profile.gpa_scale||4);
  const academics=clamp(45+gpaRatio*50+ap.length*2);
  const extracurriculars=clamp(38+activities.reduce((s,a)=>s+(5-Number(a.tier))*8+Math.min(Number(a.hours_per_week),10),0));
  const awards=clamp(35+olympiads.length*13);
  let testScores=clamp(40+(Number(profile.english_score||0)/9)*35+(Number(profile.sat||0)/1600)*25);
  const region=university.region;
  const warnings:string[]=[];
  if(region==='Hong Kong'){
    testScores=clamp(testScores+8);
    if(!profile.interview_ready)warnings.push('Для вузов Гонконга в профиле не отражена практика интервью — добавь 3 mock-интервью и банк ответов.');
  }
  if(region==='Kazakhstan')testScores=clamp(25+(Number(profile.nuet||0)/240)*45+(Number(profile.english_score||0)/9)*30);
  const holistic=clamp(academics*.35+extracurriculars*.25+awards*.15+testScores*.25+(aligned?5:-8));
  return {
    holistic_score:holistic,academics_score:academics,extracurriculars_score:extracurriculars,awards_score:awards,test_scores_score:testScores,
    coherence_notes:aligned?`Активности поддерживают заявленный Major / Spike «${profile.target_major}».`:`Spike mismatch: доказательств интереса к «${profile.target_major}» пока недостаточно.`,
    spike_alignment_notes:[...warnings,aligned?'Продолжай углублять один заметный проект вместо набора несвязанных активностей.':'Добавь профильный исследовательский проект, публичный результат и соревнование/олимпиаду по направлению.'].join(' '),
    suggestions:aligned?['Опубликовать измеримый результат главного проекта','Получить внешнюю валидацию: конкурс, пользователь или научный руководитель']:['Сделать 6–8-недельный профильный проект','Найти наставника или лабораторию','Добавить соревнование или олимпиаду по Major / Spike']
  };
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  try{
    const auth=req.headers.get('Authorization')||'';
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
    const {universityId}=await req.json();
    const [{data:profile},{data:university}]=await Promise.all([
      supabase.from('profiles').select('*').eq('user_id',user.id).single(),
      supabase.from('universities').select('*').eq('id',universityId).single()
    ]);
    if(!profile||!university)throw new Error('Profile or university not found');
    const [{data:activities},{data:olympiads},{data:ap}]=await Promise.all([
      supabase.from('activities').select('*').eq('profile_id',profile.id),
      supabase.from('olympiads').select('*').eq('profile_id',profile.id),
      supabase.from('ap_exams').select('*').eq('profile_id',profile.id)
    ]);
    let evaluation=fallback(profile,university,activities||[],olympiads||[],ap||[]);
    const apiKey=Deno.env.get('ANTHROPIC_API_KEY');
    if(apiKey){
      const prompt=`Return only JSON with keys holistic_score, academics_score, extracurriculars_score, awards_score, test_scores_score (0-100), coherence_notes, spike_alignment_notes, suggestions (2-3 strings). Never guarantee admission. Region rules: Hong Kong prioritizes IELTS/SAT and interview readiness; Kazakhstan prioritizes NUET and IELTS. Profile: ${JSON.stringify(profile)} Activities: ${JSON.stringify(activities)} Olympiads: ${JSON.stringify(olympiads)} AP: ${JSON.stringify(ap)} University: ${JSON.stringify(university)}`;
      const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-3-5-haiku-latest',max_tokens:900,messages:[{role:'user',content:prompt}]})});
      if(response.ok){const payload=await response.json();try{evaluation=JSON.parse(text(payload.content?.[0]?.text).replace(/^```json|```$/g,'').trim())}catch{/* keep deterministic fallback */}}
    }
    const {data:saved,error}=await supabase.from('ai_evaluations').insert({...evaluation,profile_id:profile.id,university_id:university.id}).select().single();
    if(error)throw error;
    return new Response(JSON.stringify({...saved,university}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Evaluation failed'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
