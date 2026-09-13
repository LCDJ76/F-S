import { useState } from 'react'
import { getMouvementsEntre } from '../data'

function lundiDeLaSemaine(date) {
  const d = new Date(date)
  const jour = d.getDay() // 0 = dimanche
  const diff = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

export default function Resume() {
  const [debut, setDebut] = useState(toInputDate(lundiDeLaSemaine(new Date())))
  const [lignes, setLignes] = useState(null)
  const [loading, setLoading] = useState(false)

  async function charger() {
    setLoading(true)
    const dateDebut = new Date(debut + 'T00:00:00')
    const dateFin = new Date(dateDebut)
    dateFin.setDate(dateFin.getDate() + 6)
    dateFin.setHours(23, 59, 59, 999)

    const mouvements = await getMouvementsEntre(dateDebut, dateFin)

    const parProduit = {}
    for (const m of mouvements) {
      if (!parProduit[m.produitNom]) {
        parProduit[m.produitNom] = { livre: 0, vendu: 0, retire: 0 }
      }
      if (m.type === 'livraison') parProduit[m.produitNom].livre += m.quantite
      if (m.type === 'vente') parProduit[m.produitNom].vendu += m.quantite
      if (m.type === 'retrait') parProduit[m.produitNom].retire += Math.abs(m.quantite)
    }

    const result = Object.entries(parProduit).map(([nom, v]) => ({
      nom,
      ...v,
      taux: v.livre > 0 ? Math.round((v.vendu / v.livre) * 100) : 0,
    }))
    result.sort((a, b) => b.livre - a.livre)
    setLignes(result)
    setLoading(false)
  }

  return (
    <div className="page">
      <h1>Résumé de la semaine</h1>
      <p className="page-hint">Semaine du lundi choisi ci-dessous, sur 7 jours.</p>

      <div className="filters-row">
        <label>
          Semaine du
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </label>
        <button className="primary-btn" onClick={charger} disabled={loading}>
          {loading ? 'Calcul…' : 'Afficher'}
        </button>
      </div>

      {lignes && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Livré</th>
              <th>Vendu</th>
              <th>Retiré</th>
              <th>Taux d'écoulement</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.nom}>
                <td>{l.nom}</td>
                <td>{l.livre}</td>
                <td>{l.vendu}</td>
                <td>{l.retire}</td>
                <td>{l.taux}%</td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr><td colSpan={5} className="empty-state">Aucun mouvement sur cette semaine.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
