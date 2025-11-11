import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import App from './App.tsx'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
)

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase not reachable (auth)', error)
  } else {
    console.log(
      '✅ Supabase reachable (auth). Session:',
      data?.session ? 'present' : 'none (expected for anon)',
    )
  }
})

async function testDevis() {
  try {
    const { data: inserted, error: insertError } = await supabase
      .from('devis')
      .insert([{ title: 'Test devis', amount_cents: 12345 }])
      .select()

    if (insertError) throw insertError
    console.log('✅ Insert OK', inserted)

    const { data: rows, error: readError } = await supabase
      .from('devis')
      .select('*')
      .limit(5)

    if (readError) throw readError
    console.log('✅ Read OK', rows)
  } catch (err) {
    console.error('❌ Devis table test failed', err)
  }
}

void testDevis()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service worker registration failed', error)
    })
  })
}
