import { useEffect, useState } from 'react'
import { getMouvementsEntre, listenProduits } from '../data'

function lundiDeLaSemaine(date) {
  const d = new Date(date)
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

function formatEuros(n) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export default function Resume() {
  const [debut, setDebut] = useState(toInputDate(lundiDeLaSemaine(new Date())))
  const [lignes, setLignes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [produits, setProduits] = useState([])

  useEffect(() => listenProduits(setProduits), [])

  useEffect(() => {
    if (produits.length > 0 && lignes === null) charger(debut)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produits])

  async function charger(dateDebutStr) {
    setLoading(true)
    const dateDebut = new Date(dateDebutStr + 'T00:00:00')
    const dateFin = new Date(dateDebut)
    dateFin.setDate(dateFin.getDate() + 6)
    dateFin.setHours(23, 59, 59, 999)

    const mouvements = await getMouvementsEntre(dateDebut, dateFin)
    const prixParNom = Object.fromEntries(produits.map((p) => [p.nom, p.prix || 0]))

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
      prix: prixParNom[nom] || 0,
      ca: v.vendu * (prixParNom[nom] || 0),
      taux: v.livre > 0 ? Math.round((v.vendu / v.livre) * 100) : 0,
    }))
    result.sort((a, b) => b.vendu - a.vendu)
    setLignes(result)
    setLoading(false)
  }

  function changerSemaine(delta) {
    const d = new Date(debut + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    const nouvelle = toInputDate(d)
    setDebut(nouvelle)
    charger(nouvelle)
  }

  function finDeSemaine() {
    const d = new Date(debut + 'T00:00:00')
    d.setDate(d.getDate() + 6)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
  }

  const totalVendu = lignes ? lignes.reduce((s, l) => s + l.vendu, 0) : 0
  const totalCA = lignes ? lignes.reduce((s, l) => s + l.ca, 0) : 0
  const meilleur = lignes && lignes.length > 0 ? lignes[0] : null

  return (
    <div className="page">
      <h1>Résumé de la semaine</h1>
      <p className="page-hint">
        Semaine du <strong>{new Date(debut + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</strong> au{' '}
        <strong>{finDeSemaine()}</strong> (lundi → dimanche, calculé automatiquement).
      </p>

      <div className="filters-row">
        <button className="primary-btn" onClick={() => changerSemaine(-1)}>← Semaine précédente</button>
        <label>
          Semaine du
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </label>
        <button className="primary-btn" onClick={() => charger(debut)} disabled={loading}>
          {loading ? 'Calcul…' : 'Afficher'}
        </button>
        <button className="primary-btn" onClick={() => changerSemaine(1)}>Semaine suivante →</button>
      </div>

      {lignes && (
        <>
          <div className="kpi-row">
            <div className="kpi-card">
              <span className="kpi-value">{totalVendu}</span>
              <span className="kpi-label">produits vendus</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{formatEuros(totalCA)}</span>
              <span className="kpi-label">chiffre de vente</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{meilleur ? meilleur.nom : '—'}</span>
              <span className="kpi-label">meilleure vente{meilleur ? ` (${meilleur.vendu})` : ''}</span>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Livré</th>
                <th>Vendu</th>
                <th>Retiré</th>
                <th>Chiffre de vente</th>
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
                  <td>{formatEuros(l.ca)}</td>
                  <td>{l.taux}%</td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={6} className="empty-state">Aucun mouvement sur cette semaine.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
