const rules=[
  [/sat|profiles_sat_check/i,'SAT должен быть от 400 до 1600.'],
  [/act|profiles_act_check/i,'ACT должен быть от 1 до 36.'],
  [/nuet/i,'NUET должен быть числом от 0 до 240.'],
  [/gpa_unweighted|gpa weighted|gpa.*check/i,'GPA должен быть от 0 до выбранной шкалы (обычно 4.0).'],
  [/gpa_scale/i,'Шкала GPA должна быть положительным числом.'],
  [/grade|profiles_grade_check/i,'Выбери класс от 9 до 12.'],
  [/hours_per_week|activities_hours_per_week_check/i,'Часы активности должны быть от 0 до 168 в неделю.'],
  [/ap_exams_score_check/i,'Оценка AP должна быть от 1 до 5.'],
  [/duplicate key|23505/i,'Такая запись уже существует. Обнови её вместо повторного добавления.'],
  [/row-level security|42501|permission denied/i,'Недостаточно прав для этого действия. Обнови страницу и войди снова.'],
];

export function friendlyError(error,fallback='Не удалось сохранить изменения. Попробуй ещё раз.'){
  const raw=[error?.code,error?.message,error?.details,error?.hint].filter(Boolean).join(' ');
  const match=rules.find(([pattern])=>pattern.test(raw));
  return match?.[1]||fallback;
}

export function friendlyAuthError(error){
  const raw=String(error?.message||'').toLowerCase();
  if(raw.includes('invalid login'))return 'Неверный email или пароль.';
  if(raw.includes('already registered'))return 'Аккаунт с этим email уже существует.';
  if(raw.includes('email not confirmed'))return 'Сначала подтверди email по ссылке в письме.';
  if(raw.includes('password'))return 'Проверь пароль: нужно минимум 8 символов.';
  return 'Не удалось выполнить вход. Попробуй ещё раз.';
}
