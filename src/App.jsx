import { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, USERS } from './firebase'

import Login from './pages/Login.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Livrer from './pages/Livrer.jsx'
import Retirer from './pages/Retirer.jsx'
import Menu from './pages/Menu.jsx'
import Historique from './pages/Historique.jsx'
import Resume from './pages/Resume.jsx'
import Vendeur from './pages/Vendeur.jsx'

export const AuthContext = createContext(null)
export const useAuthCtx = () => useContext(AuthContext)

function findUserByEmail(email) {
  const entry = Object.values(USERS).find((u) => u.email === email)
  return entry || null
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = chargement
  const [profile, setProfile] = useState(null) // { role, label }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      setProfile(u ? findUserByEmail(u.email) : null)
    })
    return unsub
  }, [])

  if (firebaseUser === undefined) {
    return <div className="loading-screen">Chargement…</div>
  }

  if (!firebaseUser || !profile) {
    return <Login />
  }

  return (
    <AuthContext.Provider value={{ profile }}>
      <div className="app-shell">
        <header className="topbar">
          <span className="brand">LCDJ Stock</span>
          <span className="who">
            {profile.label} · {profile.role === 'admin' ? 'Livreur' : 'Vendeur'}
          </span>
          <button className="link-btn" onClick={() => signOut(auth)}>
            Déconnexion
          </button>
        </header>

        {profile.role === 'admin' ? (
          <>
            <nav className="tabbar">
              <NavLink to="/" end>Tableau de bord</NavLink>
              <NavLink to="/livrer">Livrer</NavLink>
              <NavLink to="/retirer">Retirer</NavLink>
              <NavLink to="/menu">Menu semaine</NavLink>
              <NavLink to="/historique">Historique</NavLink>
              <NavLink to="/resume">Résumé</NavLink>
            </nav>
            <main className="content">
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/livrer" element={<Livrer />} />
                <Route path="/retirer" element={<Retirer />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/historique" element={<Historique />} />
                <Route path="/resume" element={<Resume />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </>
        ) : (
          <main className="content">
            <Routes>
              <Route path="/" element={<Vendeur />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        )}
      </div>
    </AuthContext.Provider>
  )
}
