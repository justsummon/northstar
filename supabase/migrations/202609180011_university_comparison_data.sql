-- Backfills display logos and structured comparison facts for seeded universities.
-- Values are deliberately marked as demo/orientation data in the UI; COALESCE
-- preserves any university data already maintained through the admin screen.
with university_data(name,domain,sat_requirement,sat_average,act_requirement,act_average,nuet_requirement,nuet_average,application_deadline) as (
  values
    ('Massachusetts Institute of Technology','mit.edu',1500,1540,34,35,null::int,null::int,'2027-01-05'::date),
    ('Imperial College London','imperial.ac.uk',null,null,null,null,null,null,'2027-01-29'::date),
    ('University of Oxford','ox.ac.uk',1470,1530,32,34,null,null,'2026-10-15'::date),
    ('Harvard University','harvard.edu',1500,1540,34,35,null,null,'2027-01-01'::date),
    ('University of Cambridge','cam.ac.uk',1460,1520,32,34,null,null,'2026-10-15'::date),
    ('Stanford University','stanford.edu',1500,1540,34,35,null,null,'2027-01-05'::date),
    ('ETH Zürich','ethz.ch',null,null,null,null,null,null,'2027-03-31'::date),
    ('California Institute of Technology','caltech.edu',1530,1550,35,36,null,null,'2027-01-03'::date),
    ('University of Pennsylvania','upenn.edu',1500,1520,34,35,null,null,'2027-01-05'::date),
    ('The University of Hong Kong','hku.hk',1350,1450,30,33,null,null,'2026-11-27'::date),
    ('The Chinese University of Hong Kong','cuhk.edu.hk',1300,1420,29,32,null,null,'2026-12-04'::date),
    ('Hong Kong University of Science and Technology','ust.hk',1350,1450,30,33,null,null,'2026-11-20'::date),
    ('The Hong Kong Polytechnic University','polyu.edu.hk',1250,1350,27,30,null,null,'2026-11-19'::date),
    ('City University of Hong Kong','cityu.edu.hk',1250,1350,27,30,null,null,'2026-11-15'::date),
    ('Nazarbayev University','nu.edu.kz',1240,1350,null,null,120,150,'2027-02-12'::date)
)
update public.universities as university
set
  logo_url=coalesce(university.logo_url,'https://www.google.com/s2/favicons?sz=128&domain_url=https://'||data.domain),
  sat_requirement=coalesce(university.sat_requirement,data.sat_requirement),
  sat_average=coalesce(university.sat_average,data.sat_average),
  act_requirement=coalesce(university.act_requirement,data.act_requirement),
  act_average=coalesce(university.act_average,data.act_average),
  nuet_requirement=coalesce(university.nuet_requirement,data.nuet_requirement),
  nuet_average=coalesce(university.nuet_average,data.nuet_average),
  application_deadline=coalesce(university.application_deadline,data.application_deadline)
from university_data as data
where university.name=data.name;
