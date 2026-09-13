import { useEffect, useState } from 'react'
import { listenProduits, ajouterProduit, setProduitActif } from '../data'

export default function Menu() {
  const [produits, setProduits] = useState([])
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')

  useEffect(() => listenProduits(setProduits), [])

  async function handleAjouter(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await ajouterProduit(nom, categorie)
    setNom('')
    setCategorie('')
  }

  return (
    <div className="page">
      <h1>Menu de la semaine</h1>
      <p className="page-hint">
        Active/désactive les produits en carte. Un produit désactivé garde son historique
        mais disparaît des écrans de saisie.
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Catégorie</th>
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
        <button type="submit" className="primary-btn">Ajouter au catalogue</button>
      </form>
    </div>
  )
}
