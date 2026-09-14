import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const produitsCol = collection(db, 'produits')
const mouvementsCol = collection(db, 'mouvements')
const livraisonsCol = collection(db, 'livraisons')

// ---------- PRODUITS ----------

// NB : on ne combine jamais where() + orderBy() sur des champs différents ici,
// ça demanderait un index composite à créer manuellement dans Firestore.
// On trie côté client à la place — largement suffisant pour ce volume.
export function listenProduits(callback, { onlyActive = false } = {}) {
  const q = onlyActive ? query(produitsCol, where('actif', '==', true)) : produitsCol
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => a.nom.localeCompare(b.nom))
    callback(list)
  })
}

export async function ajouterProduit(nom, categorie, prix) {
  await addDoc(produitsCol, {
    nom: nom.trim(),
    categorie: categorie.trim() || 'Autre',
    prix: prix ? Number(prix) : 0,
    actif: true,
    stockActuel: 0,
    dlcActuelle: null,
    createdAt: serverTimestamp(),
  })
}

export async function setProduitActif(produitId, actif) {
  await updateDoc(doc(db, 'produits', produitId), { actif })
}

export async function setProduitPrix(produitId, prix) {
  await updateDoc(doc(db, 'produits', produitId), { prix: Number(prix) || 0 })
}

// ---------- MOUVEMENTS ----------

async function logMouvement({ produitId, produitNom, type, quantite, dlc = null, motif = null, commentaire = null, utilisateur, livraisonId = null }) {
  await addDoc(mouvementsCol, {
    produitId,
    produitNom,
    type, // 'livraison' | 'retrait' | 'inventaire' | 'vente'
    quantite,
    dlc,
    motif,
    commentaire,
    utilisateur,
    livraisonId,
    dateHeure: serverTimestamp(),
  })
}

async function appliquerLivraisonLigne({ produit, quantite, dlc, utilisateur, livraisonId }) {
  const ref = doc(db, 'produits', produit.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const actuel = snap.data().stockActuel || 0
    tx.update(ref, {
      stockActuel: actuel + Number(quantite),
      dlcActuelle: dlc || snap.data().dlcActuelle || null,
    })
  })
  await logMouvement({
    produitId: produit.id,
    produitNom: produit.nom,
    type: 'livraison',
    quantite: Number(quantite),
    dlc: dlc || null,
    utilisateur,
    livraisonId,
  })
}

// Valide une livraison complète (plusieurs produits d'un coup) : met à jour
// chaque stock, journalise chaque ligne, et crée une fiche "livraisons"
// groupée avec date/heure pour l'affichage au tableau de bord.
export async function validerLivraison({ lignes, utilisateur }) {
  const livraisonRef = await addDoc(livraisonsCol, {
    dateHeure: serverTimestamp(),
    utilisateur,
    lignes: lignes.map((l) => ({
      produitId: l.produit.id,
      produitNom: l.produit.nom,
      quantite: Number(l.quantite),
      dlc: l.dlc || null,
    })),
  })

  for (const l of lignes) {
    await appliquerLivraisonLigne({
      produit: l.produit,
      quantite: l.quantite,
      dlc: l.dlc,
      utilisateur,
      livraisonId: livraisonRef.id,
    })
  }

  return livraisonRef.id
}

// Retrait : enlève du stock à tout moment, avec motif. (Théo)
export async function retirerProduit({ produit, quantite, motif, commentaire, utilisateur }) {
  const ref = doc(db, 'produits', produit.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const actuel = snap.data().stockActuel || 0
    tx.update(ref, { stockActuel: Math.max(0, actuel - Number(quantite)) })
  })
  await logMouvement({
    produitId: produit.id,
    produitNom: produit.nom,
    type: 'retrait',
    quantite: -Number(quantite),
    motif,
    commentaire,
    utilisateur,
  })
}

// Inventaire du soir : Nicolas indique ce qu'il reste. L'app déduit le vendu,
// journalise les deux mouvements, et fixe le stock au chiffre réel constaté.
export async function enregistrerInventaire({ produit, stockRestant, dlc, utilisateur }) {
  const ref = doc(db, 'produits', produit.id)
  let stockAvant = 0
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    stockAvant = snap.data().stockActuel || 0
    tx.update(ref, {
      stockActuel: Number(stockRestant),
      dlcActuelle: dlc || snap.data().dlcActuelle || null,
    })
  })

  await logMouvement({
    produitId: produit.id,
    produitNom: produit.nom,
    type: 'inventaire',
    quantite: Number(stockRestant),
    dlc: dlc || null,
    utilisateur,
  })

  const vendu = stockAvant - Number(stockRestant)
  if (vendu > 0) {
    await logMouvement({
      produitId: produit.id,
      produitNom: produit.nom,
      type: 'vente',
      quantite: vendu,
      utilisateur: 'système',
    })
  }
}

// ---------- HISTORIQUE / RÉSUMÉ / LIVRAISONS ----------

export function listenHistorique(callback, { max = 200 } = {}) {
  const q = query(mouvementsCol, orderBy('dateHeure', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function listenLivraisons(callback, { max = 30 } = {}) {
  const q = query(livraisonsCol, orderBy('dateHeure', 'desc'), limit(max))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function getMouvementsEntre(dateDebut, dateFin) {
  const q = query(
    mouvementsCol,
    where('dateHeure', '>=', Timestamp.fromDate(dateDebut)),
    where('dateHeure', '<=', Timestamp.fromDate(dateFin)),
    orderBy('dateHeure', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
