import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Ces valeurs viennent de la console Firebase (voir README, étape 2).
// Elles ne sont PAS secrètes en soi (elles apparaissent dans le code du site
// une fois déployé) — la vraie sécurité vient des règles Firestore + Auth,
// pas de cacher ces valeurs.
const firebaseConfig = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI.firebaseapp.com",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI.appspot.com",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Les deux seuls comptes de l'app. Le prénom tapé à l'écran de connexion
// est converti en "faux email" pour Firebase Auth, qui a besoin d'un email.
// Rôle déterminé uniquement par le prénom — pas de notion de site multiple.
export const USERS = {
  theo: { email: 'theo@lcdj-stock.local', role: 'admin', label: 'Théo' },
  nicolas: { email: 'nicolas@lcdj-stock.local', role: 'vendeur', label: 'Nicolas' },
}
