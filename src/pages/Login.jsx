import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, USERS } from '../firebase'

export default function Login() {
  const [prenom, setPrenom] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const key = prenom.trim().toLowerCase()
    const user = USERS[key]
    if (!user) {
      setError("Prénom non reconnu.")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, user.email, password)
    } catch (err) {
      setError('Mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>LCDJ Stock</h1>
        <p className="subtitle">Facility Serv</p>

        <label>
          Prénom
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="theo ou nicolas"
            autoFocus
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
