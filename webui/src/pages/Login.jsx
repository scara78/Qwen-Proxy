import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyKey } from '../utils/api'
import { setApiKey } from '../utils/storage'
import { useToast } from '../hooks/useToast'

export default function Login() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    try {
      const valid = await verifyKey(key.trim())
      if (valid) {
        setApiKey(key.trim())
        navigate('/chat')
      } else {
        toast.error('Cheie API invalidă')
      }
    } catch (err) {
      toast.error('Eroare la conectare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong p-8 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary mb-4 shadow-lg shadow-accent-primary/20">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Daniel's Playground</h1>
          <p className="mt-2 text-slate-400 text-sm">Introduceți cheia API pentru a continua</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="input-field"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Se verifică...' : 'Autentificare'}
          </button>
        </form>
      </div>
    </div>
  )
}