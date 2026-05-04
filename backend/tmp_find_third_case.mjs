import './src/config/env.js';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
function n(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
const {data}=await supabase.from('analysis_history').select('results').eq('id','0a73156f-c45c-41b4-a26f-00070eb94b80').single();
const rec=data.results.records||[];
const m=rec.filter(r=>n(r.hallazgoDetectado).includes('falta orden en general')||n(r.hallazgoDetectado).includes('muchos pedidos llegaron'));
console.log(JSON.stringify(m.map(r=>r.hallazgoDetectado),null,2));
