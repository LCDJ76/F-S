import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const produitsCol = collection(db, 'produits')
const mouvementsCol = collection(db, 'mouvements')

// ---------- PRODUITS ----------

export function listenProduits(callback, { onlyActive = false } = {}) {
  const q = onlyActive
    ? query(produitsCol, where('actif', '==', true), orderBy('nom'))
    : query(produitsCol, orderBy('nom'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function ajouterProduit(nom, categorie) {
  await addDoc(produitsCol, {
    nom: nom.trim(),
    categorie: categorie.trim() || 'Autre',
    actif: true,
    stockActuel: 0,
    dlcActuelle: null,
    createdAt: serverTimestamp(),
  })
}

export async function setProduitActif(produitId, actif) {
  await updateDoc(doc(db, 'produits', produitId), { actif })
}

// ---------- MOUVEMENTS ----------

async function logMouvement({ produitId, produitNom, type, quantite, dlc = null, motif = null, commentaire = null, utilisateur }) {
  await addDoc(mouvementsCol, {
    produitId,
    produitNom,
    type, // 'livraison' | 'retrait' | 'inventaire' | 'vente'
    quantite,
    dlc,
    motif,
    commentaire,
    utilisateur,
    dateHeure: serverTimestamp(),
  })
}

// Livraison : ajoute au stock, met à jour la DLC, journalise. (Théo, le matin)
export async function livrerProduit({ produit, quantite, dlc, utilisateur }) {
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
  })
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

// ---------- HISTORIQUE / RÉSUMÉ ----------

export function listenHistorique(callback, { max = 200 } = {}) {
  const q = query(mouvementsCol, orderBy('dateHeure', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() })))
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
