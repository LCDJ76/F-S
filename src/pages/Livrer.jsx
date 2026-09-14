import { useEffect, useState } from 'react'
import { listenProduits, validerLivraison } from '../data'
import { useAuthCtx } from '../App'

function maintenant() {
  return new Date().toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

export default function Livrer() {
  const { profile } = useAuthCtx()
  const [produits, setProduits] = useState([])
  const [form, setForm] = useState({}) // { [produitId]: { quantite, dlc } }
  const [status, setStatus] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])

  function updateField(produitId, field, value) {
    setForm((prev) => ({
      ...prev,
      [produitId]: { ...prev[produitId], [field]: value },
    }))
  }

  function ajouterRapide(produitId, delta) {
    setForm((prev) => {
      const actuel = Number(prev[produitId]?.quantite || 0)
      return { ...prev, [produitId]: { ...prev[produitId], quantite: actuel + delta } }
    })
  }

  async function handleValider() {
    const lignes = Object.entries(form)
      .filter(([, v]) => Number(v?.quantite) > 0)
      .map(([produitId, v]) => ({
        produit: produits.find((p) => p.id === produitId),
        quantite: v.quantite,
        dlc: v.dlc || null,
      }))

    if (lignes.length === 0) {
      setStatus('Renseigne au moins une quantité avant de valider.')
      return
    }
    setEnvoi(true)
    setStatus('Enregistrement…')
    await validerLivraison({ lignes, utilisateur: profile.label })
    setForm({})
    setStatus('Livraison enregistrée.')
    setEnvoi(false)
    setTimeout(() => setStatus(''), 2500)
  }

  return (
    <div className="page">
      <h1>Livrer</h1>
      <p className="page-hint">{maintenant()} — quantité livrée et DLC pour chaque produit du jour.</p>

      {produits.length === 0 && (
        <p className="empty-state">
          Aucun produit actif sur le menu de la semaine. Va dans "Menu semaine" pour en activer.
        </p>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Stock avant</th>
            <th>Ajout rapide</th>
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
                <div className="quick-add">
                  <button type="button" onClick={() => ajouterRapide(p.id, 1)}>+1</button>
                  <button type="button" onClick={() => ajouterRapide(p.id, 5)}>+5</button>
                  <button type="button" onClick={() => ajouterRapide(p.id, 10)}>+10</button>
                </div>
              </td>
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

      <button className="primary-btn" onClick={handleValider} disabled={envoi}>
        {envoi ? 'Enregistrement…' : 'Valider la livraison'}
      </button>
    </div>
  )
}
