const requirementCopy={
  'sat/act optional by policy year':'SAT/ACT могут быть необязательными — проверь правила текущего года',
  'sat/act policy varies':'Политика SAT/ACT меняется — проверь требования текущего года',
  'sat/act':'SAT или ACT',
  'sat':'SAT',
  'act':'ACT',
  'ielts/toefl':'IELTS или TOEFL',
  'ielts':'IELTS',
  'toefl':'TOEFL',
  'nuet':'NUET',
  'program-specific admissions test':'Вступительный тест конкретной программы',
  'subject admissions test':'Профильный вступительный тест',
  'interview':'Интервью',
  'interview may be required':'Возможно собеседование',
  'language by programme':'Языковой сертификат по требованиям программы',
  'entrance exam for some credentials':'Для некоторых аттестатов нужен вступительный экзамен',
  'need-aware for international applicants':'Финансовая потребность учитывается при рассмотрении иностранных абитуриентов',
  'need-blind with demonstrated need':'Need-blind: подтверждённая финансовая потребность может быть покрыта',
  'program-dependent estimate':'Зависит от программы — перепроверь на официальной странице',
  'orientation estimate':'Ориентировочное значение — перепроверь на официальной странице',
  'credential-dependent estimate':'Зависит от типа аттестата — перепроверь на официальной странице',
};

export function formatRequirementValue(value){
  if(Array.isArray(value))return value.map(formatRequirementValue).filter(Boolean).join(' · ');
  if(value==null||value==='')return 'Не указано — проверь на официальной странице вуза';
  if(typeof value==='number')return String(value);
  if(typeof value==='boolean')return value?'Да':'Нет';
  if(typeof value==='object')return Object.values(value).map(formatRequirementValue).filter(Boolean).join(' · ');
  const text=String(value).trim();
  const known=requirementCopy[text.toLowerCase()];
  if(known)return known;
  if(/[а-яё]/i.test(text))return text;
  return 'Требование нужно уточнить на официальной странице вуза';
}

export function formatAdmissionType(value){
  return {reach:'Амбициозный',match:'Реалистичный',safety:'Запасной'}[value]||'Не определён';
}

export function formatEventSource(value){
  return {
    manual:'Добавлено вручную',
    auto_ai_roadmap:'Персональный план',
    auto_financial_aid:'Финансовая помощь',
    financial_aid_deadline:'Финансовая помощь',
  }[value]||'Системное событие';
}

export function formatEventType(value){
  return {task:'Задача',deadline:'Дедлайн',interview:'Интервью',exam:'Экзамен'}[value]||'Этап';
}

export function majorContextText(value){
  const major=String(value||'').trim();
  return major?`Автоматический этап под ${major}. `:'';
}

export function resolveApplicationDeadline(value,today=new Date(),fallbackDays=180){
  const base=new Date(today);
  base.setHours(12,0,0,0);
  let deadline=value?new Date(`${value}T12:00:00`):new Date(Number.NaN);
  if(Number.isNaN(deadline.getTime())){
    deadline=new Date(base);
    deadline.setDate(deadline.getDate()+fallbackDays);
    return deadline;
  }
  while(deadline<base)deadline.setFullYear(deadline.getFullYear()+1);
  return deadline;
}

export function shiftDate(date,days){
  const shifted=new Date(date);
  shifted.setDate(shifted.getDate()+days);
  return shifted;
}

export function toIsoDate(date){
  return date.toISOString().slice(0,10);
}


const stageBlueprints=[
  {
    key:'documents',
    title:'Собрать документы',
    offset:-150,
    type:'task',
    estimatedMinutes:180,
    appPath:'/portfolio',
    why:'Без полного пакета документов нельзя проверить требования и вовремя отправить заявку.',
    subtasks:[
      ['Запросить выписку оценок и справку из школы',-14,60],
      ['Проверить требования к переводу и заверению',-7,45],
      ['Собрать паспорт и академические документы',0,75],
    ],
  },
  {
    key:'tests',
    title:'Закрыть требования по тестам',
    offset:-120,
    type:'exam',
    estimatedMinutes:240,
    appPath:'/portfolio',
    why:'Результаты тестов определяют, можно ли подаваться в выбранную программу без дополнительной пересдачи.',
    subtasks:[
      ['Сравнить текущие баллы с требованиями вуза',-14,45],
      ['Забронировать ближайшую подходящую дату экзамена',-7,45],
      ['Подготовить и отправить официальный score report',0,150],
    ],
  },
  {
    key:'recommendations',
    title:'Запросить рекомендации',
    offset:-95,
    type:'task',
    estimatedMinutes:120,
    appPath:'/portfolio',
    why:'Учителю нужно время, чтобы написать конкретное письмо и отправить его до дедлайна.',
    subtasks:[
      ['Выбрать рекомендателей под Major / Spike',-14,30],
      ['Передать рекомендателю достижения и контекст',-7,45],
      ['Проверить статус отправки письма',0,45],
    ],
  },
  {
    key:'essays',
    title:'Подготовить эссе',
    offset:-75,
    type:'task',
    estimatedMinutes:360,
    appPath:'/assistant',
    why:'Сильное эссе связывает цифры и активности в одну понятную историю кандидата.',
    subtasks:[
      ['Разобрать prompt и выбрать личный эпизод',-21,60],
      ['Написать первый черновик',-14,150],
      ['Получить обратную связь и отредактировать',0,150],
    ],
  },
  {
    key:'final-check',
    title:'Финальная проверка заявки',
    offset:-14,
    type:'deadline',
    estimatedMinutes:120,
    appPath:'/universities',
    why:'Запас до официального дедлайна снижает риск технических ошибок и недостающих документов.',
    subtasks:[
      ['Сверить поля заявки с документами',-7,45],
      ['Проверить эссе, рекомендации и score reports',-3,45],
      ['Отправить заявку и сохранить подтверждение',0,30],
    ],
  },
];

export function buildUniversityRoadmap(university,profile,options={}){
  const today=options.today||new Date();
  const fallbackDays=options.fallbackDays||180;
  const deadline=resolveApplicationDeadline(university.application_deadline,today,fallbackDays);
  const majorIntro=majorContextText(profile.target_major);
  const requirements=formatRequirementValue(university.other_requirements?.tests);
  const scoreSummary=`Текущие результаты: GPA ${profile.gpa_unweighted??'не указан'}, SAT ${profile.sat??'не указан'}, ACT ${profile.act??'не указан'}, NUET ${profile.nuet??'не указан'}, English ${profile.english_score??'не указан'}.`;
  const portfolioSummary=options.portfolioSummary?` Портфолио: ${options.portfolioSummary}.`:'';
  const universityKey=university.id||university.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const plans=stageBlueprints.map(stage=>{
    const date=shiftDate(deadline,stage.offset);
    return {
      key:`${universityKey}:${stage.key}`,
      event:{
        title:`${stage.title} — ${university.name}`,
        date:toIsoDate(date),
        type:stage.type,
        description:`${majorIntro}${stage.why} Требования: ${requirements}. ${stage.key==='tests'?scoreSummary:''}${portfolioSummary}`,
        roadmap_key:`${universityKey}:${stage.key}`,
        metadata:{
          stage:stage.key,
          university:university.name,
          university_id:university.id||null,
          application_deadline:toIsoDate(deadline),
          why:stage.why,
          app_path:stage.appPath,
          estimated_minutes:stage.estimatedMinutes,
          change_reason:`Этап пересчитан от дедлайна ${university.name}: ${toIsoDate(deadline)}`,
        },
      },
      subtasks:stage.subtasks.map(([title,offset,estimatedMinutes],sortOrder)=>({
        title,
        due_date:toIsoDate(shiftDate(date,offset)),
        estimated_minutes:estimatedMinutes,
        sort_order:sortOrder,
      })),
    };
  });

  const rawRequirements=JSON.stringify(university.other_requirements?.tests||'').toLowerCase();
  const region=`${university.country||''} ${university.region||''}`.toLowerCase();
  if(region.includes('hong kong')||rawRequirements.includes('interview')){
    const date=shiftDate(deadline,-42);
    const why='Практика заранее помогает подготовить конкретные ответы о мотивации, Major / Spike и выбранной программе.';
    plans.push({
      key:`${universityKey}:interview`,
      event:{
        title:`Подготовка к интервью — ${university.name}`,
        date:toIsoDate(date),
        type:'interview',
        description:`${majorIntro}${why}`,
        roadmap_key:`${universityKey}:interview`,
        metadata:{
          stage:'interview',
          university:university.name,
          university_id:university.id||null,
          application_deadline:toIsoDate(deadline),
          why,
          app_path:'/assistant',
          estimated_minutes:180,
          change_reason:`Интервью пересчитано за 6 недель до дедлайна ${university.name}: ${toIsoDate(deadline)}`,
        },
      },
      subtasks:[
        {title:'Подготовить ответы о мотивации и Major / Spike',due_date:toIsoDate(shiftDate(date,-14)),estimated_minutes:60,sort_order:0},
        {title:'Провести первое mock-интервью',due_date:toIsoDate(shiftDate(date,-7)),estimated_minutes:60,sort_order:1},
        {title:'Провести финальную репетицию',due_date:toIsoDate(date),estimated_minutes:60,sort_order:2},
      ],
    });
  }

  return {deadline:toIsoDate(deadline),plans:plans.sort((a,b)=>a.event.date.localeCompare(b.event.date))};
}

export function calculateRoadmapProgress(events,subtasks,university){
  const relevantEvents=university?events.filter(event=>event.metadata?.university===university):events;
  const eventIds=new Set(relevantEvents.map(event=>event.id));
  const relevantSubtasks=subtasks.filter(task=>eventIds.has(task.calendar_event_id));
  const total=relevantEvents.length+relevantSubtasks.length;
  const completed=relevantEvents.filter(event=>event.completed).length+relevantSubtasks.filter(task=>task.completed).length;
  return total?Math.round(completed/total*100):0;
}
