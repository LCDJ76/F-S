import { useEffect, useState } from 'react'
import { listenProduits, listenLivraisons, getMouvementsEntre } from '../data'

function lundiDeLaSemaine(date) {
  const d = new Date(date)
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateHeure(ts) {
  if (!ts?.toDate) return '…'
  return ts.toDate().toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminDashboard() {
  const [produits, setProduits] = useState([])
  const [livraisons, setLivraisons] = useState([])
  const [ouverte, setOuverte] = useState(null)
  const [topVentes, setTopVentes] = useState([])

  useEffect(() => listenProduits(setProduits, { onlyActive: true }), [])
  useEffect(() => listenLivraisons(setLivraisons), [])

  useEffect(() => {
    async function charger() {
      const debut = lundiDeLaSemaine(new Date())
      const mouvements = await getMouvementsEntre(debut, new Date())
      const parProduit = {}
      for (const m of mouvements) {
        if (m.type !== 'vente') continue
        parProduit[m.produitNom] = (parProduit[m.produitNom] || 0) + m.quantite
      }
      const top = Object.entries(parProduit)
        .map(([nom, qte]) => ({ nom, qte }))
        .sort((a, b) => b.qte - a.qte)
        .slice(0, 5)
      setTopVentes(top)
    }
    charger()
  }, [livraisons])

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
              <td>{p.dlcActuelle || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dashboard-grid">
        <div>
          <h2>Livraisons récentes</h2>
          {livraisons.length === 0 && <p className="empty-state">Aucune livraison enregistrée pour l'instant.</p>}
          <div className="livraison-list">
            {livraisons.map((l) => {
              const estOuverte = ouverte === l.id
              const total = l.lignes.reduce((s, x) => s + x.quantite, 0)
              return (
                <div key={l.id} className="livraison-card">
                  <button
                    type="button"
                    className="livraison-header"
                    onClick={() => setOuverte(estOuverte ? null : l.id)}
                  >
                    <span>{formatDateHeure(l.dateHeure)}</span>
                    <span className="livraison-meta">{l.utilisateur} · {total} unités · {l.lignes.length} produits</span>
                    <span className="chevron">{estOuverte ? '▲' : '▼'}</span>
                  </button>
                  {estOuverte && (
                    <table className="data-table livraison-detail">
                      <thead>
                        <tr><th>Produit</th><th>Quantité</th><th>DLC</th></tr>
                      </thead>
                      <tbody>
                        {l.lignes.map((ligne, i) => (
                          <tr key={i}>
                            <td>{ligne.produitNom}</td>
                            <td>+{ligne.quantite}</td>
                            <td>{ligne.dlc || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2>Meilleures ventes (cette semaine)</h2>
          {topVentes.length === 0 && <p className="empty-state">Pas encore de ventes cette semaine.</p>}
          <table className="data-table">
            <thead><tr><th>Produit</th><th>Vendu</th></tr></thead>
            <tbody>
              {topVentes.map((t) => (
                <tr key={t.nom}><td>{t.nom}</td><td>{t.qte}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
