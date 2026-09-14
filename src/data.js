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
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const produitsCol = collection(db, 'produits')
const mouvementsCol = collection(db, 'mouvements')
const livraisonsCol = collection(db, 'livraisons')

// Un produit a maintenant plusieurs "lots" : [{ dlc, quantite }, ...]
// stockActuel reste sur le produit comme total pré-calculé, pratique pour
// l'affichage rapide (tableau de bord, etc.) sans recalculer à chaque fois.

function sommeLots(lots) {
  return (lots || []).reduce((s, l) => s + l.quantite, 0)
}

// ---------- PRODUITS ----------

export function listenProduits(callback, { onlyActive = false } = {}) {
  const q = onlyActive ? query(produitsCol, where('actif', '==', true)) : produitsCol
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), lots: d.data().lots || [] }))
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
    lots: [],
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

// Ajoute une quantité à un lot DLC précis du produit (crée le lot s'il n'existe pas).
async function appliquerLivraisonLigne({ produit, quantite, dlc, utilisateur, livraisonId }) {
  const ref = doc(db, 'produits', produit.id)
  const dlcKey = dlc || null
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const lots = [...(snap.data().lots || [])]
    const idx = lots.findIndex((l) => l.dlc === dlcKey)
    if (idx >= 0) {
      lots[idx] = { ...lots[idx], quantite: lots[idx].quantite + Number(quantite) }
    } else {
      lots.push({ dlc: dlcKey, quantite: Number(quantite) })
    }
    tx.update(ref, { lots, stockActuel: sommeLots(lots) })
  })
  await logMouvement({
    produitId: produit.id,
    produitNom: produit.nom,
    type: 'livraison',
    quantite: Number(quantite),
    dlc: dlcKey,
    utilisateur,
    livraisonId,
  })
}

// Valide une livraison complète (plusieurs produits, chacun avec sa DLC) :
// met à jour les lots de chaque produit, journalise, et crée une fiche
// "livraisons" groupée avec date/heure pour l'affichage au tableau de bord.
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

// Retrait sur un lot DLC précis (produit périmé/abîmé sur CE lot-là).
export async function retirerProduit({ produit, dlc, quantite, motif, commentaire, utilisateur }) {
  const ref = doc(db, 'produits', produit.id)
  const dlcKey = dlc || null
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const lots = [...(snap.data().lots || [])]
    const idx = lots.findIndex((l) => l.dlc === dlcKey)
    if (idx >= 0) {
      const nouvelleQte = Math.max(0, lots[idx].quantite - Number(quantite))
      if (nouvelleQte === 0) lots.splice(idx, 1)
      else lots[idx] = { ...lots[idx], quantite: nouvelleQte }
    }
    tx.update(ref, { lots, stockActuel: sommeLots(lots) })
  })
  await logMouvement({
    produitId: produit.id,
    produitNom: produit.nom,
    type: 'retrait',
    quantite: -Number(quantite),
    dlc: dlcKey,
    motif,
    commentaire,
    utilisateur,
  })
}

// Inventaire du soir : Nicolas indique ce qu'il reste, lot par lot (DLC par DLC).
// entrees = [{ dlc, quantiteRestante }]
export async function enregistrerInventaireLots({ produit, entrees, utilisateur }) {
  const ref = doc(db, 'produits', produit.id)
  const resultats = []

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const lots = [...(snap.data().lots || [])]

    for (const e of entrees) {
      const idx = lots.findIndex((l) => l.dlc === e.dlc)
      const avant = idx >= 0 ? lots[idx].quantite : 0
      const restant = Number(e.quantiteRestante)
      resultats.push({ dlc: e.dlc, avant, restant, vendu: avant - restant })

      if (restant <= 0) {
        if (idx >= 0) lots.splice(idx, 1)
      } else if (idx >= 0) {
        lots[idx] = { ...lots[idx], quantite: restant }
      } else {
        lots.push({ dlc: e.dlc, quantite: restant })
      }
    }

    tx.update(ref, { lots, stockActuel: sommeLots(lots) })
  })

  for (const r of resultats) {
    await logMouvement({
      produitId: produit.id,
      produitNom: produit.nom,
      type: 'inventaire',
      quantite: r.restant,
      dlc: r.dlc,
      utilisateur,
    })
    if (r.vendu > 0) {
      await logMouvement({
        produitId: produit.id,
        produitNom: produit.nom,
        type: 'vente',
        quantite: r.vendu,
        dlc: r.dlc,
        utilisateur: 'système',
      })
    }
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

// ---------- REMISE À ZÉRO (après tests) ----------

// Remet tous les produits à 0 (lots vidés) et efface tout l'historique
// (mouvements + livraisons). Les produits eux-mêmes (nom, catégorie, prix,
// actif) sont conservés. Irréversible — à utiliser une fois avant le vrai
// démarrage, pas en usage courant.
export async function reinitialiserTout() {
  const [produitsSnap, mouvementsSnap, livraisonsSnap] = await Promise.all([
    getDocs(produitsCol),
    getDocs(mouvementsCol),
    getDocs(livraisonsCol),
  ])

  const batch = writeBatch(db)
  produitsSnap.docs.forEach((d) => {
    batch.update(doc(db, 'produits', d.id), { lots: [], stockActuel: 0 })
  })
  mouvementsSnap.docs.forEach((d) => batch.delete(doc(db, 'mouvements', d.id)))
  livraisonsSnap.docs.forEach((d) => batch.delete(doc(db, 'livraisons', d.id)))

  await batch.commit()
}
