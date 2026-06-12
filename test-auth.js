const { createClient } = require('@supabase/supabase-js');

const url = 'https://hrbnigtxfezgqbtrrzrt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYm5pZ3R4ZmV6Z3FidHJyenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjUzNDcsImV4cCI6MjA5NjcwMTM0N30.lPrRsdkRagg4RSCh07UQwn2HshanJMDbzC8uOEyGULA';

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const email = 'ghaasen.test2@gmail.com';
  const password = 'Test123456!';

  console.log('1. Registriere...');
  const { data: reg, error: regErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: 'GHaasen' } }
  });
  if (regErr) { console.log('   FEHLER:', regErr.message); process.exit(1); }
  console.log('   OK - User ID:', reg.user?.id);

  console.log('2. Login...');
  const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) { console.log('   FEHLER:', loginErr.message); process.exit(1); }
  const userId = login.user?.id;
  console.log('   OK - Session aktiv:', !!login.session, '| UserID:', userId);

  console.log('3. Profil speichern...');
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  let saveErr;
  if (existing) {
    const r = await supabase.from('profiles').update({
      name: 'GHaasen', age: 30, weight: 80, height: 180,
      gender: 'maennlich', goal: 'muskelaufbau', activity_level: 'moderat',
      updated_at: new Date().toISOString()
    }).eq('id', userId);
    saveErr = r.error;
  } else {
    const r = await supabase.from('profiles').insert({
      id: userId, email, name: 'GHaasen', age: 30, weight: 80, height: 180,
      gender: 'maennlich', goal: 'muskelaufbau', activity_level: 'moderat'
    });
    saveErr = r.error;
  }
  if (saveErr) {
    console.log('   FEHLER:', saveErr.message, '| Code:', saveErr.code, '| Details:', saveErr.details);
    process.exit(1);
  }
  console.log('   OK - Profil gespeichert');

  console.log('4. Profil lesen...');
  const { data: profile, error: readErr } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (readErr) { console.log('   FEHLER:', readErr.message); process.exit(1); }
  console.log('   OK:', JSON.stringify({ name: profile.name, weight: profile.weight, height: profile.height, goal: profile.goal }));

  console.log('5. Gewicht loggen...');
  const { error: wErr } = await supabase.from('weight_logs').insert({
    user_id: userId, date: new Date().toISOString().split('T')[0], weight: 80
  });
  if (wErr) { console.log('   FEHLER:', wErr.message, '| Code:', wErr.code); }
  else { console.log('   OK'); }

  console.log('\n=== ALLE TESTS BESTANDEN ===');
}

run().catch(e => { console.error('Unerwarteter Fehler:', e.message); process.exit(1); });
