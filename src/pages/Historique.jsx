import { useEffect, useMemo, useState } from 'react'
import { listenHistorique } from '../data'

const TYPE_LABELS = {
  livraison: 'Livraison',
  retrait: 'Retrait',
  inventaire: 'Inventaire soir',
  vente: 'Vente (calculée)',
}

function formatDateHeure(ts) {
  if (!ts?.toDate) return '…'
  const d = ts.toDate()
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function Historique() {
  const [mouvements, setMouvements] = useState([])
  const [filtreProduit, setFiltreProduit] = useState('')
  const [filtreType, setFiltreType] = useState('')

  useEffect(() => listenHistorique(setMouvements), [])

  const produitsUniques = useMemo(
    () => [...new Set(mouvements.map((m) => m.produitNom))].sort(),
    [mouvements],
  )

  const filtres = mouvements.filter((m) => {
    if (filtreProduit && m.produitNom !== filtreProduit) return false
    if (filtreType && m.type !== filtreType) return false
    return true
  })

  return (
    <div className="page">
      <h1>Historique</h1>

      <div className="filters-row">
        <select value={filtreProduit} onChange={(e) => setFiltreProduit(e.target.value)}>
          <option value="">Tous les produits</option>
          {produitsUniques.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filtreType} onChange={(e) => setFiltreType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date / heure</th>
            <th>Produit</th>
            <th>Type</th>
            <th>Quantité</th>
            <th>Détail</th>
            <th>Par</th>
          </tr>
        </thead>
        <tbody>
          {filtres.map((m) => (
            <tr key={m.id}>
              <td>{formatDateHeure(m.dateHeure)}</td>
              <td>{m.produitNom}</td>
              <td>{TYPE_LABELS[m.type] || m.type}</td>
              <td className={m.quantite < 0 ? 'neg' : ''}>{m.quantite > 0 ? '+' : ''}{m.quantite}</td>
              <td>{[m.motif, m.commentaire, m.dlc ? `DLC ${m.dlc}` : null].filter(Boolean).join(' — ')}</td>
              <td>{m.utilisateur}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
