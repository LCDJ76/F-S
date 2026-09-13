# LCDJ Stock — Facility Serv

Webapp de suivi de stock/livraison pour remplacer le tableau Excel. Deux comptes :
- **Théo** (admin/livreur) : livre, retire du stock, gère le menu, consulte l'historique et le résumé
- **Nicolas** (vendeur, Facility Serv) : renseigne chaque soir le stock restant

Stack : React (Vite) hébergé sur **GitHub Pages**, base de données + authentification sur **Firebase** (gratuit pour ce volume d'usage).

---

## Plan complet, dans l'ordre

1. Créer le projet Firebase
2. Activer l'authentification (les 2 comptes)
3. Activer Firestore (la base de données) + poser les règles de sécurité
4. Récupérer la config Firebase et la coller dans le code
5. Tester en local
6. Déployer sur GitHub Pages
7. Utilisation au quotidien

---

## 1. Créer le projet Firebase

1. Va sur https://console.firebase.google.com avec le **Gmail dédié** que tu as créé.
2. Clique **"Ajouter un projet"**.
3. Donne-lui un nom, par exemple `lcdj-stock`.
4. Tu peux **désactiver Google Analytics** (pas utile ici, coche la case pour ne pas l'activer).
5. Clique **"Créer le projet"**, attends la fin, puis **"Continuer"**.

Tu arrives sur le tableau de bord de ton projet Firebase.

## 2. Activer l'authentification

1. Dans le menu de gauche : **Build → Authentication**.
2. Clique **"Commencer"** (Get started).
3. Dans l'onglet **"Sign-in method"**, choisis **"E-mail/Mot de passe"**.
4. Active le premier interrupteur ("E-mail/Mot de passe"), laisse le second désactivé, clique **"Enregistrer"**.
5. Va dans l'onglet **"Users"** (Utilisateurs), clique **"Ajouter un utilisateur"** :
   - Email : `theo@lcdj-stock.local`
   - Mot de passe : choisis un mot de passe solide, note-le de côté
   - Valide
6. Refais la même chose pour :
   - Email : `nicolas@lcdj-stock.local`
   - Mot de passe : un autre mot de passe, note-le aussi

> Ces adresses `@lcdj-stock.local` ne sont pas de vraies boîtes mail — c'est juste un identifiant technique pour Firebase (qui exige un format email). Dans l'app, Théo et Nicolas tapent juste "theo" ou "nicolas", pas cette adresse.

## 3. Activer Firestore (la base de données)

1. Menu de gauche : **Build → Firestore Database**.
2. Clique **"Créer une base de données"**.
3. Choisis le mode **Production**.
4. Choisis une région proche (ex : `eur3 (europe-west)`), puis **"Activer"**.
5. Une fois créée, va dans l'onglet **"Règles"** (Rules) en haut.
6. Remplace tout le contenu par celui du fichier `firebase/firestore.rules` fourni dans ce projet, puis clique **"Publier"**.

## 4. Récupérer la config Firebase

1. Dans la console Firebase, clique sur la **roue crantée** (⚙️) en haut à gauche → **"Paramètres du projet"**.
2. Descends jusqu'à **"Vos applications"**, clique sur l'icône **`</>`** (Web) pour ajouter une app web.
3. Donne-lui un nom (ex : `lcdj-stock-web`), **ne coche pas** "Firebase Hosting" (on utilise GitHub Pages), clique **"Enregistrer l'application"**.
4. Firebase t'affiche un bloc `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. Copie ces valeurs.
5. Ouvre le fichier `src/firebase.js` du projet et remplace les `"REMPLACE_MOI"` par les vraies valeurs, ligne par ligne.

## 5. Tester en local (optionnel mais recommandé)

Il te faut [Node.js](https://nodejs.org) installé (version 18 ou plus).

```bash
npm install
npm run dev
```

Ouvre l'adresse affichée dans le terminal (en général `http://localhost:5173`). Connecte-toi avec `theo` / ton mot de passe pour vérifier que tout fonctionne, avant de mettre en ligne.

## 6. Déployer sur GitHub Pages

1. Crée un repo GitHub (public ou privé, peu importe), par exemple `lcdj-stock-app`.
2. Ouvre `vite.config.js` et vérifie que la ligne `base:` correspond bien au nom de ton repo :
   ```js
   base: '/lcdj-stock-app/',
   ```
   (remplace `lcdj-stock-app` par le nom exact de ton repo si différent)
3. Pousse le code sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/<ton-user>/lcdj-stock-app.git
   git push -u origin main
   ```
4. Installe les dépendances si ce n'est pas déjà fait, puis déploie :
   ```bash
   npm install
   npm run deploy
   ```
   Cette commande construit le site et le pousse automatiquement sur une branche `gh-pages`.
5. Sur GitHub : **Settings → Pages**, dans "Build and deployment", choisis la branche `gh-pages` comme source, dossier `/ (root)`.
6. Après une ou deux minutes, ton site est en ligne à l'adresse indiquée (`https://<ton-user>.github.io/lcdj-stock-app/`).

Pour toute future mise à jour du code, il suffit de refaire `npm run deploy`.

## 7. Utilisation au quotidien

**Premier lancement (Théo) :**
- Va dans **"Menu semaine"**, ajoute tes produits (nom + catégorie), ils sont actifs par défaut.

**Chaque lundi (ou quand le menu change) :**
- Va dans **"Menu semaine"**, décoche les produits qui sortent de la carte, ajoute les nouveaux.

**Chaque matin (Théo) :**
- Va dans **"Livrer"**, indique la quantité livrée et la DLC pour chaque produit, clique **"Valider la livraison"**.
- Si besoin, va dans **"Retirer"** pour un produit périmé/abîmé/invendable.

**Chaque soir (Nicolas) :**
- Se connecte avec `nicolas`, un seul écran : il indique ce qu'il reste de chaque produit, clique **"Enregistrer mon inventaire"**.

**Pour analyser :**
- **"Historique"** : liste chronologique de tout ce qui s'est passé, filtrable.
- **"Résumé"** : sélectionne une semaine, voit livré/vendu/retiré par produit et le taux d'écoulement.

---

## Structure du projet

```
src/
  firebase.js       → config Firebase + les 2 comptes (prénom → email/rôle)
  data.js           → toute la logique métier (livraison, retrait, inventaire, historique)
  App.jsx           → connexion, navigation, routes
  pages/
    Login.jsx       → écran de connexion (prénom + mot de passe)
    AdminDashboard.jsx → tableau de bord Théo
    Livrer.jsx      → saisie livraison + DLC
    Retirer.jsx     → retrait de stock avec motif
    Menu.jsx        → gestion du menu de la semaine
    Historique.jsx  → journal complet filtrable
    Resume.jsx      → résumé hebdomadaire
    Vendeur.jsx     → écran unique de Nicolas
firebase/
  firestore.rules   → règles de sécurité de la base
```

## Si un jour tu veux ajouter un deuxième site/vendeur

Ce n'est pas prévu dans cette version (volontairement, pour rester simple). Le jour où ça arrive, il faudra ajouter une notion de "site" dans le modèle de données — c'est un chantier à part, pas une simple option à cocher.
