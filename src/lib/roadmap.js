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
