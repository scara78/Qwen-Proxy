import { useState, useEffect, useCallback } from 'react'
import { getApiKey } from '../utils/storage'
import { API_ENDPOINTS } from '../utils/constants'
import { vercelSyncNow } from '../utils/api'
import { useToast } from '../hooks/useToast'

function fetchWithAuth(url, options = {}) {
  const key = getApiKey()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  })
}

export default function Vercel() {
  const [status, setStatus] = useState(null)
  const [envs, setEnvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [visibleValues, setVisibleValues] = useState({})
  const [editingEnv, setEditingEnv] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [quickForm, setQuickForm] = useState({ API_KEY: '', ACCOUNTS: '', DATA_SAVE_MODE: '' })
  // sync-now panel
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncScopes, setSyncScopes] = useState({ accounts: true, disabled: true, proxies: true })
  const { toast } = useToast()

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.VERCEL_STATUS)
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    }
  }, [])

  const loadEnvs = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.VERCEL_ENV)
      if (res.ok) {
        const data = await res.json()
        setEnvs(data.envs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadEnvs()
  }, [loadStatus, loadEnvs])

  const toggleVisibility = (id) => {
    setVisibleValues(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleEdit = (env) => {
    setEditingEnv(env)
    setEditValue(env.value)
  }

  const handleSaveEdit = async () => {
    if (!editingEnv) return
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.VERCEL_ENV, {
        method: 'POST',
        body: JSON.stringify({ key: editingEnv.key, value: editValue }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Actualizat ${editingEnv.key}`)
        setEditingEnv(null)
        loadEnvs()
      } else {
        toast.error(data.error || 'Actualizarea a eșuat')
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleQuickSave = async (key) => {
    const value = quickForm[key]
    if (!value.trim()) return
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.VERCEL_ENV, {
        method: 'POST',
        body: JSON.stringify({ key, value: value.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Actualizat ${key}`)
        setQuickForm(prev => ({ ...prev, [key]: '' }))
        loadEnvs()
      } else {
        toast.error(data.error || 'Actualizarea a eșuat')
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRedeploy = async () => {
    setDeploying(true)
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.VERCEL_REDEPLOY, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Deployment declanșat, URL: ${data.url}`)
      } else {
        toast.error(data.error || 'Deployment eșuat')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeploying(false)
    }
  }

  const handleSyncNow = async () => {
    const scopes = Object.keys(syncScopes).filter(k => syncScopes[k])
    if (scopes.length === 0) {
      toast.error('Vă rugăm să selectați cel puțin un element de sincronizat')
      return
    }
    setSyncBusy(true)
    try {
      const res = await vercelSyncNow(scopes)
      const summary = []
      for (const [k, v] of Object.entries(res.result || {})) {
        if (v.synced) summary.push(`${k}: ${v.count ?? '✓'}`)
        else if (v.reason === 'redis_active') summary.push(`${k}: Omis (Redis activ)`)
        else if (v.reason === 'vercel_not_configured') summary.push(`${k}: Omis (Vercel neconfigurat)`)
        else summary.push(`${k}: Eșuat`)
      }
      toast.success(`Sincronizare finalizată: ${summary.join(', ')} (Vercel se va redeploya automat)`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSyncBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Se încarcă...
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 19.5h20L12 2z" />
              </svg>
              Sincronizare Vercel
            </h1>
            <p className="mt-1 text-sm text-slate-400">Gestionați variabilele de mediu și deployment-urile Vercel</p>
          </div>
          <button
            onClick={handleRedeploy}
            disabled={deploying || !status?.configured}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {deploying ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Se instalează...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Redeploy
              </>
            )}
          </button>
        </div>

        {/* Alternative-via-Redis hint */}
        <div className="glass-card p-4 mb-6 animate-slide-up border-l-2 border-l-accent-primary/30">
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Se poate fără sincronizare Vercel?
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Da. Scopul principal al sincronizării Vercel este de a scrie <code className="text-accent-glow">ACCOUNTS</code> înapoi în Vercel env pentru a fi păstrat după redeployment.
            Dacă ați activat deja <code className="text-accent-glow">DATA_SAVE_MODE=redis</code>, starea conturilor și a proxy-urilor va fi persistată direct în Redis,
            prin <a href="/admin" className="text-accent-glow hover:underline">Panoul de administrare</a> le puteți gestiona, fără a fi nevoie de panoul de sincronizare Vercel.
            Alegeți doar una dintre cele două metode, modul Redis fiind mai universal și potrivit pentru alte platforme serverless.
          </p>
        </div>

        {/* Status Card */}
        <div className="glass-card p-5 mb-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status?.configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
            Stare conexiune
          </h3>
          {status?.configured ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Token:</span>
                  <span className="text-emerald-400">Configurat</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Project ID:</span>
                  <span className="text-emerald-400">Configurat</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Team ID:</span>
                  <span className={status?.hasTeamId ? 'text-emerald-400' : 'text-slate-500'}>
                    {status?.hasTeamId ? 'Configurat' : 'Neconfigurat (cont personal)'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                {status?.projectId && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">Project ID detectat</div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(status.projectId); toast.success('Project ID copiat') }}
                      className="font-mono text-accent-glow hover:underline break-all text-left"
                      title="Faceți clic pentru a copia"
                    >
                      {status.projectId}
                    </button>
                  </div>
                )}
                {status?.teamId && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">Team ID detectat</div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(status.teamId); toast.success('Team ID copiat') }}
                      className="font-mono text-accent-glow hover:underline break-all text-left"
                      title="Faceți clic pentru a copia"
                    >
                      {status.teamId}
                    </button>
                  </div>
                )}
                {status?.vercelUrl && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">URL deployment curent</div>
                    <a
                      href={`https://${status.vercelUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-accent-glow hover:underline break-all"
                    >
                      {status.vercelUrl}
                    </a>
                  </div>
                )}
                {status?.vercelEnv && (
                  <div className="text-xs">
                    <div className="text-slate-500 mb-1">Mediu deployment</div>
                    <span className="font-mono text-slate-300">{status.vercelEnv}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Vă rugăm să verificați dacă Project ID-ul coincide cu cel din <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-accent-glow hover:underline">Vercel Dashboard</a>. Faceți clic pe ID pentru a-l copia.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-300">Conexiunea Vercel nu este configurată, vă rugăm să adăugați următoarele variabile de mediu în setările proiectului din Vercel Dashboard și apoi să faceți redeploy:</p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${status?.hasToken ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    VERCEL_TOKEN
                  </span>
                  <span className="text-slate-500">— la <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="text-accent-glow hover:underline">vercel.com/account/tokens</a> creați un Personal Token</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${status?.hasProjectId ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    VERCEL_PROJECT_ID
                  </span>
                  <span className="text-slate-500">— Settings proiect → General → Project ID (Vercel nu injectează automat această variabilă la runtime, trebuie configurată manual)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-400">
                    VERCEL_TEAM_ID
                  </span>
                  <span className="text-slate-500">— Necesar doar pentru conturile de echipă; lăsați gol pentru conturile personale</span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.15] text-xs text-amber-200/90 leading-relaxed">
                <div className="font-semibold mb-1">Pași de configurare:</div>
                <ol className="space-y-0.5 list-decimal list-inside">
                  <li>Deschideți acest proiect în Vercel Dashboard → Settings → Environment Variables</li>
                  <li>Adăugați variabilele de mai sus (cel puțin VERCEL_TOKEN și VERCEL_PROJECT_ID), selectați toate cele trei target-uri</li>
                  <li>Reveniți la Deployments → cea mai recentă → Redeploy</li>
                  <li>După reîmprospătarea paginii, puteți gestiona toate variabilele de mediu aici și puteți declanșa un redeploy</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Manual sync-now panel */}
        {status?.configured && !status?.redisConfigured && (
          <div className="glass-card p-5 mb-6 animate-slide-up">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sincronizați acum cu variabilele de mediu Vercel
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Trimiteți conturile / lista de conturi dezactivate / proxy-urile din memoria curentă în variabilele de mediu ale proiectului Vercel, pentru a fi recuperate la următorul cold start.
              <span className="text-amber-300/80">Fiecare sincronizare va declanșa un nou build (aproximativ 1 minut), vă rugăm să faceți clic după ce ați finalizat operațiunile în masă.</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {[
                { key: 'accounts', label: 'ACCOUNTS' },
                { key: 'disabled', label: 'DISABLED_ACCOUNTS' },
                { key: 'proxies', label: 'PROXIES' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!syncScopes[key]}
                    onChange={(e) => setSyncScopes(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.06]"
                  />
                  <code className="font-mono">{label}</code>
                </label>
              ))}
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncBusy}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {syncBusy ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Se sincronizează...
                </>
              ) : (
                'Sincronizează acum'
              )}
            </button>
          </div>
        )}

        {/* Quick Settings */}
        {status?.configured && (
          <div className="glass-card p-5 mb-6 animate-slide-up animate-delay-100">
            <h3 className="text-sm font-semibold text-white mb-4">Setări rapide</h3>
            <div className="space-y-3">
              {[
                { key: 'API_KEY', placeholder: 'Cheie API (separate prin virgulă)', type: 'password' },
                { key: 'ACCOUNTS', placeholder: 'Conturi (email:parolă, separate prin virgulă)', type: 'password' },
                { key: 'DATA_SAVE_MODE', placeholder: 'none sau file', type: 'text' },
              ].map(({ key, placeholder, type }) => (
                <div key={key} className="flex items-center gap-3">
                  <code className="text-xs font-mono text-accent-glow w-36 flex-shrink-0">{key}</code>
                  <input
                    type={type}
                    value={quickForm[key]}
                    onChange={(e) => setQuickForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field flex-1 text-sm py-2"
                  />
                  <button
                    onClick={() => handleQuickSave(key)}
                    disabled={!quickForm[key].trim()}
                    className="btn-primary text-xs py-2 px-3 disabled:opacity-30"
                  >
                    Salvează
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environment Variables Table */}
        {status?.configured && (
          <div className="glass-card overflow-hidden animate-slide-up animate-delay-200">
            <div className="p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Variabile de mediu</h3>
              <p className="text-xs text-slate-500 mt-1">Toate variabilele de mediu ale proiectului curent</p>
            </div>
            {envs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Nicio variabilă de mediu</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Nume variabilă</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Valoare</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Mediu</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envs.map((env) => (
                      <tr key={env.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <code className="text-xs font-mono text-accent-glow">{env.key}</code>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-300 max-w-[200px] truncate">
                              {visibleValues[env.id] ? (env.value || '(gol)') : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleVisibility(env.id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {visibleValues[env.id] ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                )}
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            {(env.target || []).map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleEdit(env)}
                            className="text-xs text-slate-400 hover:text-accent-glow transition-colors"
                          >
                            Editează
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingEnv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-strong p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Editează <code className="text-accent-glow">{editingEnv.key}</code>
              </h3>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="input-field font-mono text-sm mb-4"
                autoFocus
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingEnv(null)}
                  className="btn-ghost text-sm"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary text-sm"
                >
                  Salvează
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}