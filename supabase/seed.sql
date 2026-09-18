insert into public.universities
  (name,country,region,city,qs_rank,admission_type,acceptance_rate,gpa_requirement,other_requirements,average_admitted_profile)
values
('Massachusetts Institute of Technology','USA','North America','Cambridge',1,'reach',4.8,3.90,'{"tests":["SAT/ACT optional by policy year","IELTS/TOEFL"],"aid":"need-aware for international applicants","qs_year":2026,"data_note":"Acceptance and GPA are orientation estimates"}','{"Academics":96,"Extracurriculars":90,"Awards":91,"Test Scores":94}'),
('Imperial College London','UK','Europe','London',2,'reach',11.0,3.85,'{"tests":["IELTS","program-specific admissions test"],"qs_year":2026,"data_note":"Program-dependent estimate"}','{"Academics":94,"Extracurriculars":82,"Awards":84,"Test Scores":92}'),
('University of Oxford','UK','Europe','Oxford',3,'reach',13.9,3.90,'{"tests":["IELTS","subject admissions test","interview"],"qs_year":2026,"data_note":"Program-dependent estimate"}','{"Academics":96,"Extracurriculars":83,"Awards":90,"Test Scores":93}'),
('Harvard University','USA','North America','Cambridge',4,'reach',3.6,3.95,'{"tests":["SAT/ACT","IELTS/TOEFL"],"aid":"need-blind with demonstrated need","qs_year":2026,"data_note":"Orientation estimate"}','{"Academics":96,"Extracurriculars":94,"Awards":93,"Test Scores":95}'),
('University of Cambridge','UK','Europe','Cambridge',5,'reach',16.0,3.90,'{"tests":["IELTS","subject admissions test","interview"],"qs_year":2026,"data_note":"Program-dependent estimate"}','{"Academics":96,"Extracurriculars":84,"Awards":90,"Test Scores":94}'),
('Stanford University','USA','North America','Stanford',6,'reach',3.9,3.95,'{"tests":["SAT/ACT","IELTS/TOEFL"],"aid":"need-aware for international applicants","qs_year":2026,"data_note":"Orientation estimate"}','{"Academics":96,"Extracurriculars":95,"Awards":92,"Test Scores":95}'),
('ETH Zürich','Switzerland','Europe','Zürich',7,'reach',27.0,3.80,'{"tests":["language by programme","entrance exam for some credentials"],"qs_year":2026,"data_note":"Credential-dependent estimate"}','{"Academics":94,"Extracurriculars":78,"Awards":86,"Test Scores":91}'),
('California Institute of Technology','USA','North America','Pasadena',10,'reach',3.0,3.95,'{"tests":["SAT/ACT policy varies","IELTS/TOEFL"],"qs_year":2026,"data_note":"Orientation estimate"}','{"Academics":98,"Extracurriculars":88,"Awards":94,"Test Scores":96}'),
('University of Pennsylvania','USA','North America','Philadelphia',11,'reach',5.9,3.90,'{"tests":["SAT/ACT","IELTS/TOEFL"],"qs_year":2026,"data_note":"Orientation estimate"}','{"Academics":94,"Extracurriculars":92,"Awards":88,"Test Scores":93}'),
('The University of Hong Kong','Hong Kong','Hong Kong','Hong Kong',17,'reach',17.0,3.75,'{"tests":["IELTS","SAT","interview may be required"],"regional_weight":"tests_and_interview","qs_year":2026}','{"Academics":91,"Extracurriculars":80,"Awards":82,"Test Scores":93}'),
('The Chinese University of Hong Kong','Hong Kong','Hong Kong','Hong Kong',36,'reach',20.0,3.70,'{"tests":["IELTS","SAT","interview may be required"],"regional_weight":"tests_and_interview","qs_year":2026}','{"Academics":89,"Extracurriculars":79,"Awards":80,"Test Scores":91}'),
('Hong Kong University of Science and Technology','Hong Kong','Hong Kong','Hong Kong',47,'reach',21.0,3.70,'{"tests":["IELTS","SAT","interview"],"regional_weight":"tests_and_interview","qs_year":2026}','{"Academics":90,"Extracurriculars":82,"Awards":82,"Test Scores":92}'),
('The Hong Kong Polytechnic University','Hong Kong','Hong Kong','Hong Kong',57,'match',28.0,3.55,'{"tests":["IELTS","SAT","interview may be required"],"regional_weight":"tests_and_interview","qs_year":2026}','{"Academics":85,"Extracurriculars":78,"Awards":76,"Test Scores":88}'),
('City University of Hong Kong','Hong Kong','Hong Kong','Hong Kong',62,'match',30.0,3.50,'{"tests":["IELTS","SAT","interview may be required"],"regional_weight":"tests_and_interview","qs_year":2026}','{"Academics":84,"Extracurriculars":76,"Awards":74,"Test Scores":88}'),
('Nazarbayev University','Kazakhstan','Kazakhstan','Astana',401,'match',25.0,3.50,'{"tests":["NUET","IELTS"],"regional_weight":"nuet_and_ielts","ranking_note":"QS band/orientation; verify current official listing"}','{"Academics":84,"Extracurriculars":72,"Awards":74,"Test Scores":90}');

insert into public.profiles
  (full_name,school,city,country,grade,target_major,gpa_unweighted,gpa_scale,english_exam_type,english_score,sat,nuet,annual_budget,currency,needs_full_aid,portfolio_public,target_countries,narrative_about_me,is_demo,leaderboard_score)
select
  'Demo Student ' || gs,
  (array['NIS Astana','NIS Almaty','RFMSH','Haileybury Almaty','Tashkent International School','International School of Prague'])[1 + (gs % 6)],
  (array['Astana','Almaty','Tashkent','Bishkek','Prague','Dubai'])[1 + (gs % 6)],
  (array['Kazakhstan','Kazakhstan','Uzbekistan','Kyrgyzstan','Czech Republic','UAE'])[1 + (gs % 6)],
  10 + (gs % 2),
  (array['Computer Science','Economics','Biomedical Engineering','Political Science','Data Science','Mechanical Engineering'])[1 + (gs % 6)],
  round((3.10 + ((gs % 90)::numeric / 100)),2),
  4,
  'IELTS',
  round((6.0 + ((gs % 16)::numeric / 10)),1),
  1180 + (gs % 41) * 10,
  110 + (gs % 31),
  8000 + (gs % 33) * 1000,
  'USD',
  gs % 3 = 0,
  true,
  case when gs % 5 = 0 then array['Kazakhstan'] when gs % 4 = 0 then array['Hong Kong'] else array['USA','UK'] end,
  'Synthetic public profile for leaderboard benchmarking. No real person data.',
  true,
  round((62 + (gs % 3600)::numeric / 100),2)
from generate_series(1,650) gs;

insert into public.activities(profile_id,name,tier,hours_per_week,description)
select id,
  case when target_major in ('Computer Science','Data Science') then 'Open-source / research project' else 'Community initiative' end,
  case when leaderboard_score > 90 then '1'::public.activity_tier when leaderboard_score > 82 then '2'::public.activity_tier when leaderboard_score > 74 then '3'::public.activity_tier else '4'::public.activity_tier end,
  2 + (extract(day from created_at)::int % 8),
  'Synthetic activity generated for demo leaderboard calibration.'
from public.profiles where is_demo;

insert into public.olympiads(profile_id,name,level,result)
select id,'Demo subject olympiad',case when leaderboard_score > 90 then 'international' when leaderboard_score > 80 then 'national' else 'school' end,
case when leaderboard_score > 88 then 'winner' when leaderboard_score > 78 then 'finalist' else 'participant' end
from public.profiles where is_demo and leaderboard_score > 72;
