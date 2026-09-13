import { useEffect, useState } from 'react'
import { listenProduits, retirerProduit } from '../data'
import { useAuthCtx } from '../App'

const MOTIFS = ['Périmé', 'Invendable', 'Abîmé', 'Autre']

export default function Retirer() {
  const { profile } = useAuthCtx()
  const [produits, setProduits] = useState([])
  const [produitId, setProduitId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState(MOTIFS[0])
  const [commentaire, setCommentaire] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])

  async function handleSubmit(e) {
    e.preventDefault()
    const produit = produits.find((p) => p.id === produitId)
    if (!produit || !quantite) {
      setStatus('Choisis un produit et une quantité.')
      return
    }
    await retirerProduit({ produit, quantite, motif, commentaire, utilisateur: profile.label })
    setQuantite('')
    setCommentaire('')
    setStatus(`${quantite} ${produit.nom} retiré(s).`)
    setTimeout(() => setStatus(''), 2500)
  }

  return (
    <div className="page">
      <h1>Retirer du stock</h1>
      <p className="page-hint">À utiliser à tout moment — produit périmé, abîmé, invendable…</p>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Produit
          <select value={produitId} onChange={(e) => setProduitId(e.target.value)} required>
            <option value="">— choisir —</option>
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} (stock : {p.stockActuel ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantité
          <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
        </label>

        <label>
          Motif
          <select value={motif} onChange={(e) => setMotif(e.target.value)}>
            {MOTIFS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          Commentaire (optionnel)
          <input type="text" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </label>

        {status && <p className="status-msg">{status}</p>}

        <button type="submit" className="primary-btn">Enregistrer le retrait</button>
      </form>
    </div>
  )
}
