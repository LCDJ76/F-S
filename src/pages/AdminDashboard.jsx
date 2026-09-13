import { useEffect, useState } from 'react'
import { listenProduits } from '../data'

function formatDate(dlc) {
  if (!dlc) return '—'
  return dlc
}

export default function AdminDashboard() {
  const [produits, setProduits] = useState([])

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])

  return (
    <div className="page">
      <h1>Tableau de bord</h1>
      <p className="page-hint">Produits du menu de la semaine.</p>

      {produits.length === 0 && (
        <p className="empty-state">
          Aucun produit actif. Va dans "Menu semaine" pour en activer.
        </p>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Stock actuel</th>
            <th>DLC</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p) => (
            <tr key={p.id} className={p.stockActuel === 0 ? 'row-empty' : ''}>
              <td>{p.nom}</td>
              <td>{p.stockActuel ?? 0}</td>
              <td>{formatDate(p.dlcActuelle)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
