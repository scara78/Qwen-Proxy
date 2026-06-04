import { useState } from 'react'
import { useToast } from '../hooks/useToast'
import { getApiKey } from '../utils/storage'

const endpoints = [
  // ================== OpenAI Compatibil ==================
  {
    category: 'openai',
    method: 'POST',
    path: '/v1/chat/completions',
    title: 'Completare chat',
    description: 'Creează o completare de chat, cu suport pentru streaming. Compatibil cu formatul OpenAI.',
    auth: true,
    body: {
      model: 'qwen3.6-plus',
      messages: [{ role: 'user', content: 'Hello!' }],
      stream: false,
    },
    response: {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello! How can I help you?' }, finish_reason: 'stop' }],
    },
    notes: [
      'Suportă streaming prin `stream: true` (format SSE)',
      'Sufixe model: `-thinking`, `-search`, `-thinking-search`, `-image`, `-video`',
      'Structura mesajelor respectă formatul OpenAI: roluri system, user, assistant',
    ],
  },
  {
    category: 'openai',
    method: 'GET',
    path: '/v1/models',
    title: 'Listă modele',
    description: 'Obține dinamic toate modelele disponibile în prezent pe chat.qwen.ai, inclusiv modelele de bază și diversele sufixe variate (thinking / search / image / video / image-edit).',
    auth: true,
    body: null,
    response: {
      object: 'list',
      data: [
        { id: 'qwen3.6-plus', object: 'model', owned_by: 'qwen' },
        { id: 'qwen3.6-plus-thinking', object: 'model', owned_by: 'qwen' },
        { id: 'qwen3.6-plus-search', object: 'model', owned_by: 'qwen' },
      ],
    },
    notes: [
      'Obținut dinamic de pe chat.qwen.ai la runtime și memorat în cache la cerere (păstrat după prima apelare)',
      'Clientul OpenAI poate folosi direct `models.list()`',
      'Clienții Gemini / Anthropic pot folosi acest endpoint pentru a descoperi ID-urile modelelor disponibile înainte de a construi cererile',
      'Răspunsul include modelele de bază și versiunile cu sufixele `-thinking` și `-search`; selectorul din interfață le va grupa automat',
    ],
  },
  {
    category: 'openai',
    method: 'POST',
    path: '/v1/images/generations',
    title: 'Generare imagine',
    description: 'Generează o imagine pe baza unui prompt text. Compatibil cu formatul OpenAI.',
    auth: true,
    body: {
      model: 'qwen3.6-plus-image',
      prompt: 'A beautiful sunset over mountains',
      n: 1,
      size: '1024x1024',
    },
    response: {
      created: 1700000000,
      data: [{ url: 'https://...' }],
    },
    notes: ['Utilizează modelul cu sufixul `-image`', 'Suportă diverse dimensiuni'],
  },
  {
    category: 'openai',
    method: 'POST',
    path: '/v1/images/edits',
    title: 'Editare imagine',
    description: 'Editează o imagine prin instrucțiuni text. Suportă încărcare multipart.',
    auth: true,
    body: { image: '<file>', prompt: 'Make the sky blue', model: 'qwen3.6-plus-image-edit' },
    response: { created: 1700000000, data: [{ url: 'https://...' }] },
    notes: ['Încărcare prin multipart/form-data', 'Utilizează modelul cu sufixul `-image-edit`'],
  },
  {
    category: 'openai',
    method: 'POST',
    path: '/v1/videos',
    title: 'Generare video',
    description: 'Generează un video pe baza unui prompt text.',
    auth: true,
    body: { model: 'qwen3.6-plus-video', prompt: 'A cat playing piano' },
    response: { data: [{ url: 'https://...' }] },
    notes: ['Utilizează modelul cu sufixul `-video`', 'Timpul de procesare poate fi mai lung'],
  },

  // ================== Anthropic Compatibil ==================
  {
    category: 'anthropic',
    method: 'POST',
    path: '/v1/messages',
    title: 'Messages (Anthropic)',
    description: 'Inițiază o conversație folosind formatul Anthropic Messages; convertit intern pentru backend-ul Qwen.',
    auth: true,
    authHeader: 'x-api-key',
    body: {
      model: 'qwen3.6-plus',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello, Claude' }],
      stream: false,
    },
    response: {
      id: 'msg_xxx',
      type: 'message',
      role: 'assistant',
      model: 'qwen3.6-plus',
      content: [{ type: 'text', text: 'Hello!' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    },
    notes: [
      'Oferă de asemenea ruta sinonimă `/anthropic/v1/messages`',
      'Suportă header-ul `x-api-key` sau `Authorization: Bearer ...`',
      'Suportă streaming prin `stream: true`, evenimentele SSE respectând specificațiile Anthropic',
    ],
  },
  {
    category: 'anthropic',
    method: 'POST',
    path: '/anthropic/v1/messages',
    title: 'Messages (cale namespace)',
    description: 'La fel ca `/v1/messages`, oferit clienților care doresc să păstreze prefixul `/anthropic`.',
    auth: true,
    authHeader: 'x-api-key',
    body: {
      model: 'qwen3.6-plus',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hi' }],
    },
    response: {
      id: 'msg_xxx',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: '...' }],
    },
    notes: ['Comportamentul este identic cu cel al `/v1/messages`'],
  },

  // ================== Gemini Compatibil ==================
  {
    category: 'gemini',
    method: 'POST',
    path: '/v1beta/models/{model}:generateContent',
    title: 'generateContent (non-streaming)',
    description: 'Inițiază o generare de conținut folosind formatul Google Gemini; convertit intern pentru Qwen.',
    auth: true,
    authHeader: 'x-goog-api-key',
    body: {
      contents: [{ role: 'user', parts: [{ text: 'Hello, Gemini' }] }],
      generationConfig: { temperature: 0.7 },
    },
    response: {
      candidates: [{
        content: { role: 'model', parts: [{ text: 'Hello!' }] },
        finishReason: 'STOP',
        index: 0,
      }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    },
    notes: [
      'Înlocuiți `{model}` din cale cu numele modelului, de exemplu `qwen3.6-plus`',
      'Suportă de asemenea `/v1/models/{model}:generateContent`',
      'Suportă header-ul `x-goog-api-key`, parametrul de interogare `?key=...` sau `Authorization: Bearer ...`',
    ],
  },
  {
    category: 'gemini',
    method: 'POST',
    path: '/v1beta/models/{model}:streamGenerateContent',
    title: 'streamGenerateContent (streaming)',
    description: 'Generează conținut în format streaming Gemini SSE.',
    auth: true,
    authHeader: 'x-goog-api-key',
    body: {
      contents: [{ role: 'user', parts: [{ text: 'Tell me a story' }] }],
    },
    response: {
      candidates: [{ content: { role: 'model', parts: [{ text: '...' }] }, index: 0 }],
    },
    notes: [
      'Răspunsul este de tip `text/event-stream`',
      'Suportă de asemenea `/v1/models/{model}:streamGenerateContent`',
    ],
  },

  // ================== Administrare (Admin) ==================
  {
    category: 'admin',
    method: 'GET',
    path: '/api/getAllAccounts',
    title: 'Obține toate conturile',
    description: 'Obține toate conturile Qwen configurate și starea lor.',
    auth: true,
    admin: true,
    body: null,
    response: { total: 1, page: 1, pageSize: 1000, data: [{ email: 'user@example.com', token: '...', expires: 1700000000 }] },
    notes: ['Necesită cheia API de administrator (prima din variabila de mediu API_KEY)', 'Suportă paginare prin `?page=&pageSize=`'],
  },
  {
    category: 'admin',
    method: 'POST',
    path: '/api/setAccount',
    title: 'Adaugă cont',
    description: 'Adăugare cont Qwen nou.',
    auth: true,
    admin: true,
    body: { email: 'user@example.com', password: 'password123' },
    response: { email: 'user@example.com', message: 'Account created successfully' },
    notes: ['Doar pentru administratori', 'Contul se va autentifica automat pentru a obține Token-ul'],
  },
  {
    category: 'admin',
    method: 'DELETE',
    path: '/api/deleteAccount',
    title: 'Șterge cont',
    description: 'Elimină un cont Qwen.',
    auth: true,
    admin: true,
    body: { email: 'user@example.com' },
    response: { message: 'Account deleted successfully' },
    notes: ['Doar pentru administratori'],
  },
  {
    category: 'admin',
    method: 'POST',
    path: '/api/refreshAccount',
    title: 'Reîmprospătează Token cont',
    description: 'Forțează reîmprospătarea Token-ului pentru contul specificat.',
    auth: true,
    admin: true,
    body: { email: 'user@example.com' },
    response: { message: 'Account token refreshed successfully', email: 'user@example.com' },
    notes: ['Doar pentru administratori', 'Re-autentificare la Qwen'],
  },
  {
    category: 'admin',
    method: 'POST',
    path: '/api/refreshAllAccounts',
    title: 'Reîmprospătează toate Token-urile',
    description: 'Forțează reîmprospătarea Token-urilor pentru toate conturile.',
    auth: true,
    admin: true,
    body: { thresholdHours: 24 },
    response: { message: 'Batch refresh complete', refreshedCount: 3, thresholdHours: 24 },
    notes: ['Doar pentru administratori', 'Poate dura ceva timp dacă sunt multe conturi'],
  },

  // ================== Publice ==================
  {
    category: 'public',
    method: 'POST',
    path: '/verify',
    title: 'Verifică cheia API',
    description: 'Verifică dacă o cheie API este validă.',
    auth: false,
    body: { apiKey: 'sk-your-key' },
    response: { valid: true, isAdmin: true, status: 200, message: 'success' },
    notes: ['Nu necesită autentificare'],
  },
  {
    category: 'public',
    method: 'GET',
    path: '/health',
    title: 'Verificare stare (Health Check)',
    description: 'Verifică dacă serviciul rulează normal.',
    auth: false,
    body: null,
    response: { status: 'ok' },
    notes: ['Nu necesită autentificare', 'Poate fi utilizat pentru monitorizare'],
  },
]

const methodColors = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/25',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

const categoryMeta = {
  openai: { label: 'OpenAI', badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  anthropic: { label: 'Anthropic', badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  gemini: { label: 'Gemini', badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  admin: { label: 'Admin', badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  public: { label: 'Public', badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
}

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false)
  const [trying, setTrying] = useState(false)
  const [response, setResponse] = useState(null)
  const { toast } = useToast()
  const cat = categoryMeta[endpoint.category] || categoryMeta.public

  const tryablePath = endpoint.path.replace('{model}', 'qwen3.6-plus')
  const isTryable = !endpoint.path.includes('{')

  const handleTry = async () => {
    setTrying(true)
    setResponse(null)
    const key = getApiKey()

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (endpoint.auth && key) {
        if (endpoint.authHeader === 'x-api-key') headers['x-api-key'] = key
        else if (endpoint.authHeader === 'x-goog-api-key') headers['x-goog-api-key'] = key
        else headers['Authorization'] = `Bearer ${key}`
      }

      const options = {
        method: endpoint.method,
        headers,
      }

      if (endpoint.body && endpoint.method !== 'GET') {
        options.body = JSON.stringify(endpoint.body)
      }

      const res = await fetch(tryablePath, options)
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      setResponse({ status: res.status, data })
    } catch (err) {
      setResponse({ status: 0, data: { error: err.message } })
      toast.error(err.message)
    } finally {
      setTrying(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiat în clipboard')
  }

  const authLine = endpoint.auth
    ? endpoint.authHeader === 'x-api-key'
      ? "  -H 'x-api-key: YOUR_API_KEY' \\\n"
      : endpoint.authHeader === 'x-goog-api-key'
      ? "  -H 'x-goog-api-key: YOUR_API_KEY' \\\n"
      : "  -H 'Authorization: Bearer YOUR_API_KEY' \\\n"
    : ''

  const curlExample = `curl -X ${endpoint.method} '${window.location.origin}${endpoint.path}' \\
${authLine}  -H 'Content-Type: application/json'${endpoint.body ? ` \\
  -d '${JSON.stringify(endpoint.body, null, 2)}'` : ''}`

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-slate-300 flex-1 truncate">{endpoint.path}</code>
        <span className="text-sm text-slate-400 hidden sm:block">{endpoint.title}</span>
        <span className={`px-2 py-0.5 rounded text-xs border ${cat.badgeClass}`}>
          {cat.label}
        </span>
        {endpoint.admin && (
          <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Admin
          </span>
        )}
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4 animate-fade-in">
          <p className="text-sm text-slate-400">{endpoint.description}</p>

          {endpoint.notes.length > 0 && (
            <div className="space-y-1">
              {endpoint.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-accent-primary mt-0.5">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}

          {endpoint.body && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Corp cerere</h4>
                <button
                  onClick={() => handleCopy(JSON.stringify(endpoint.body, null, 2))}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Copiază
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-black/30 border border-white/[0.06] text-xs font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(endpoint.body, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Exemplu răspuns</h4>
              <button
                onClick={() => handleCopy(JSON.stringify(endpoint.response, null, 2))}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Copiază
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/30 border border-white/[0.06] text-xs font-mono text-emerald-300/80 overflow-x-auto">
              {JSON.stringify(endpoint.response, null, 2)}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">cURL</h4>
              <button
                onClick={() => handleCopy(curlExample)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Copiază
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/30 border border-white/[0.06] text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <button
              onClick={handleTry}
              disabled={trying || !isTryable}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isTryable ? '' : 'Vă rugăm să înlocuiți {model} cu numele real al modelului înainte de a testa'}
            >
              {trying ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Se trimite...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Testează
                </>
              )}
            </button>
            {endpoint.auth && (
              <span className="text-xs text-slate-500">
                🔑 Folosește cheia API salvată (
                {endpoint.authHeader === 'x-api-key' ? 'x-api-key' :
                 endpoint.authHeader === 'x-goog-api-key' ? 'x-goog-api-key' : 'Authorization'})
              </span>
            )}
          </div>

          {response && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rezultat răspuns</h4>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}>
                  {response.status}
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-black/30 border border-white/[0.06] text-xs font-mono text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Docs() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? endpoints : endpoints.filter(e => e.category === filter)

  const filters = [
    { key: 'all', label: 'Toate' },
    { key: 'openai', label: 'OpenAI' },
    { key: 'anthropic', label: 'Anthropic' },
    { key: 'gemini', label: 'Gemini' },
    { key: 'admin', label: 'Admin' },
    { key: 'public', label: 'Publice' },
  ]

  return (
    <div className="h-screen overflow-y-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-white">Documentație API</h1>
          <p className="mt-1 text-sm text-slate-400">
            Oferă acces la același backend Qwen în trei formate: OpenAI / Anthropic / Gemini
          </p>
        </div>

        <div className="glass-card p-5 mb-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Metodă de autentificare
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            Alegeți header-ul de autentificare corespunzător în funcție de protocolul API utilizat:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06]">
              <div className="text-slate-400 mb-1">OpenAI</div>
              <code className="text-accent-glow font-mono">Authorization: Bearer sk-...</code>
            </div>
            <div className="px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06]">
              <div className="text-slate-400 mb-1">Anthropic</div>
              <code className="text-accent-glow font-mono">x-api-key: sk-...</code>
            </div>
            <div className="px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06]">
              <div className="text-slate-400 mb-1">Gemini</div>
              <code className="text-accent-glow font-mono">x-goog-api-key: sk-...</code>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Prima cheie din variabila de mediu API_KEY este cheia de administrator, care poate accesa interfața de administrare `/api/*`.
          </p>
        </div>

        <div className="glass-card p-5 mb-6 animate-slide-up animate-delay-100">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Sufixe de model
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {[
              { suffix: '-thinking', desc: 'Activează modul de raționament/gândire' },
              { suffix: '-search', desc: 'Activează căutarea web îmbunătățită' },
              { suffix: '-thinking-search', desc: 'Activează simultan gândirea și căutarea' },
              { suffix: '-image', desc: 'Mod generare imagini' },
              { suffix: '-video', desc: 'Mod generare video' },
              { suffix: '-image-edit', desc: 'Mod editare imagini' },
            ].map(({ suffix, desc }) => (
              <div key={suffix} className="flex items-center gap-2 text-sm">
                <code className="px-2 py-0.5 rounded bg-white/[0.05] text-accent-glow text-xs font-mono">{suffix}</code>
                <span className="text-slate-400 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-accent-primary/15 text-accent-glow border border-accent-primary/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((endpoint, i) => (
            <div key={endpoint.path + endpoint.method} style={{ animationDelay: `${i * 50}ms` }}>
              <EndpointCard endpoint={endpoint} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}