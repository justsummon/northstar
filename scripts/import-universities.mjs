import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const supabaseUrl=process.env.SUPABASE_URL;
const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const scorecardKey=process.env.COLLEGE_SCORECARD_API_KEY;

if(!supabaseUrl||!serviceRoleKey){
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing universities.');
}

const source=JSON.parse(await readFile(new URL('../supabase/data/universities.json',import.meta.url),'utf8'));
if(!Array.isArray(source.records)||source.records.length<80){
  throw new Error('University catalog must contain at least 80 records.');
}

const supabase=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false}});
const names=source.records.map(record=>record.name);
const existingByName=new Map();

for(let index=0;index<names.length;index+=40){
  const {data,error}=await supabase.from('universities').select('*').in('name',names.slice(index,index+40));
  if(error)throw error;
  for(const row of data||[])existingByName.set(row.name,row);
}

async function scorecardSnapshot(name){
  if(!scorecardKey)return null;
  const params=new URLSearchParams({
    api_key:scorecardKey,
    'school.name':name,
    fields:[
      'id','school.name','school.city',
      'latest.admissions.admission_rate.overall',
      'latest.admissions.sat_scores.average.overall',
      'latest.admissions.act_scores.midpoint.cumulative',
    ].join(','),
    per_page:'1',
  });
  const response=await fetch(`https://api.data.gov/ed/collegescorecard/v1/schools?${params}`);
  if(!response.ok)throw new Error(`College Scorecard ${response.status} for ${name}`);
  return (await response.json()).results?.[0]||null;
}

const rows=[];
for(const record of source.records){
  const existing=existingByName.get(record.name)||{};
  let scorecard=null;
  if(record.country==='USA'){
    try{scorecard=await scorecardSnapshot(record.name)}
    catch(error){console.warn(error.message)}
  }

  const admissionRate=scorecard?.['latest.admissions.admission_rate.overall'];
  const satAverage=scorecard?.['latest.admissions.sat_scores.average.overall'];
  const actAverage=scorecard?.['latest.admissions.act_scores.midpoint.cumulative'];
  const mergedRequirements={
    ...(existing.other_requirements||{}),
    ...(record.other_requirements||{}),
    source_urls:[...new Set([
      ...((existing.other_requirements?.source_urls)||[]),
      ...((record.other_requirements?.source_urls)||[]),
      ...(scorecard?['https://collegescorecard.ed.gov/data/']:[]),
    ])],
  };

  const candidate={
    ...record,
    other_requirements:mergedRequirements,
    acceptance_rate:admissionRate!=null?Number((admissionRate*100).toFixed(2)):record.acceptance_rate,
    sat_average:satAverage??record.sat_average,
    act_average:actAverage??record.act_average,
    data_source_url:scorecard?'https://collegescorecard.ed.gov/data/api-documentation/':record.data_source_url,
    data_verified_at:new Date().toISOString().slice(0,10),
  };

  const row={};
  for(const [key,value] of Object.entries(candidate)){
    if(value!==null&&value!==undefined)row[key]=value;
    else if(existing.id===undefined)row[key]=value;
  }
  rows.push(row);
}

for(let index=0;index<rows.length;index+=25){
  const {error}=await supabase.from('universities').upsert(rows.slice(index,index+25),{onConflict:'name'});
  if(error)throw error;
}

console.log(`Imported ${rows.length} universities. College Scorecard enrichment: ${scorecardKey?'enabled':'skipped (no COLLEGE_SCORECARD_API_KEY)'}.`);
