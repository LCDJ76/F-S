import { useEffect, useState } from 'react'
import { listenProduits, ajouterProduit, setProduitActif, setProduitPrix } from '../data'

export default function Menu() {
  const [produits, setProduits] = useState([])
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')
  const [prix, setPrix] = useState('')

  useEffect(() => listenProduits(setProduits), [])

  async function handleAjouter(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await ajouterProduit(nom, categorie, prix)
    setNom('')
    setCategorie('')
    setPrix('')
  }

  return (
    <div className="page">
      <h1>Menu de la semaine</h1>
      <p className="page-hint">
        Active/désactive les produits en carte. Un produit désactivé garde son historique
        mais disparaît des écrans de saisie. Le prix sert au calcul du chiffre de vente
        dans le résumé hebdomadaire.
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Catégorie</th>
            <th>Prix (€)</th>
            <th>Actif cette semaine</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.categorie}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.10"
                  className="cell-input"
                  defaultValue={p.prix ?? 0}
                  onBlur={(e) => setProduitPrix(p.id, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!p.actif}
                  onChange={(e) => setProduitActif(p.id, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Ajouter un nouveau produit</h2>
      <form className="stack-form" onSubmit={handleAjouter}>
        <label>
          Nom
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />
        </label>
        <label>
          Catégorie (optionnel)
          <input type="text" value={categorie} onChange={(e) => setCategorie(e.target.value)} placeholder="Plat, dessert…" />
        </label>
        <label>
          Prix de vente (€)
          <input type="number" min="0" step="0.10" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="0.00" />
        </label>
        <button type="submit" className="primary-btn">Ajouter au catalogue</button>
      </form>
    </div>
  )
}
