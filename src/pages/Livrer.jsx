import { useEffect, useState } from 'react'
import { listenProduits, livrerProduit } from '../data'
import { useAuthCtx } from '../App'

export default function Livrer() {
  const { profile } = useAuthCtx()
  const [produits, setProduits] = useState([])
  const [form, setForm] = useState({}) // { [produitId]: { quantite, dlc } }
  const [status, setStatus] = useState('')

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])

  function updateField(produitId, field, value) {
    setForm((prev) => ({
      ...prev,
      [produitId]: { ...prev[produitId], [field]: value },
    }))
  }

  async function handleValider() {
    const lignes = Object.entries(form).filter(([, v]) => v?.quantite)
    if (lignes.length === 0) {
      setStatus("Renseigne au moins une quantité avant de valider.")
      return
    }
    setStatus('Enregistrement…')
    for (const [produitId, v] of lignes) {
      const produit = produits.find((p) => p.id === produitId)
      await livrerProduit({
        produit,
        quantite: v.quantite,
        dlc: v.dlc || null,
        utilisateur: profile.label,
      })
    }
    setForm({})
    setStatus('Livraison enregistrée.')
    setTimeout(() => setStatus(''), 2500)
  }

  return (
    <div className="page">
      <h1>Livrer</h1>
      <p className="page-hint">Quantité livrée et DLC pour chaque produit du jour.</p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Stock avant</th>
            <th>Quantité livrée</th>
            <th>DLC</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.stockActuel ?? 0}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  className="cell-input"
                  value={form[p.id]?.quantite ?? ''}
                  onChange={(e) => updateField(p.id, 'quantite', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  className="cell-input"
                  value={form[p.id]?.dlc ?? ''}
                  onChange={(e) => updateField(p.id, 'dlc', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {status && <p className="status-msg">{status}</p>}

      <button className="primary-btn" onClick={handleValider}>
        Valider la livraison
      </button>
    </div>
  )
}
