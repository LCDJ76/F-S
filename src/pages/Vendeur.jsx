import { useEffect, useState } from 'react'
import { listenProduits, enregistrerInventaire } from '../data'
import { useAuthCtx } from '../App'

export default function Vendeur() {
  const { profile } = useAuthCtx()
  const [produits, setProduits] = useState([])
  const [valeurs, setValeurs] = useState({}) // { [produitId]: stockRestant }
  const [status, setStatus] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])

  async function handleEnregistrer() {
    setEnvoi(true)
    setStatus('')
    const lignes = Object.entries(valeurs).filter(([, v]) => v !== '' && v !== undefined)
    for (const [produitId, v] of lignes) {
      const produit = produits.find((p) => p.id === produitId)
      await enregistrerInventaire({
        produit,
        stockRestant: v,
        dlc: produit.dlcActuelle,
        utilisateur: profile.label,
      })
    }
    setValeurs({})
    setStatus('Inventaire enregistré, merci !')
    setEnvoi(false)
  }

  return (
    <div className="page vendeur-page">
      <h1>Bonsoir 👋</h1>
      <p className="page-hint">Indique ce qu'il te reste pour chaque produit.</p>

      <div className="vendeur-list">
        {produits.map((p) => (
          <div key={p.id} className="vendeur-row">
            <div className="vendeur-row-info">
              <strong>{p.nom}</strong>
              <span className="vendeur-dlc">DLC {p.dlcActuelle || '—'}</span>
            </div>
            <input
              type="number"
              min="0"
              className="vendeur-input"
              value={valeurs[p.id] ?? ''}
              onChange={(e) => setValeurs((prev) => ({ ...prev, [p.id]: e.target.value }))}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {status && <p className="status-msg">{status}</p>}

      <button className="primary-btn big" onClick={handleEnregistrer} disabled={envoi}>
        {envoi ? 'Enregistrement…' : 'Enregistrer mon inventaire'}
      </button>
    </div>
  )
}
