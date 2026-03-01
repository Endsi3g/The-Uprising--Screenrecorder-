# 🤖 Directives de Codage pour l'IA (AI Coding Instructions)

Ce document contient des règles strictes et des connaissances architecturales pour tout agent IA travaillant sur **The Uprising Screenrecorder**. Lisez attentivement avant de modifier le code.

## 🏗️ Architecture du Projet

- **Framework**: Electron + React + Tailwind CSS.
- **Gestion d'État**: Zustand (voir `src/store/useStore.ts`).
- **Rendu Vidéo**: PixiJS pour la prévisualisation et l'exportation (voir `src/lib/frameRenderer.ts`).
- **Communication IPC**: Tous les appels système passent par `electron/ipc/handlers.ts` et sont exposés via `electron/preload.ts`.

## 🛠️ Règles de Développement

### 1. Pas de Placeholders (Zéro Tolérance)
- Ne jamais écrire `// ... logic here` ou `// À implémenter`.
- Implémentez la fonctionnalité complète ou ne modifiez pas le fichier.
- Si une bibliothèque manque, suggérez son installation via `npm install`.

### 2. Typage Strict (TypeScript)
- Utilisez des types exhaustifs pour toutes les fonctions et composants.
- Évitez le type `any`. Utilisez des interfaces ou des types génériques.
- Définissez les types partagés dans `src/components/video-editor/types.ts`.

### 3. Rendu de Caractères et Localisation
- **Optimisation Française**: Toutes les fonctions liées au texte (Auto-Captions, UI) doivent supporter l'encodage UTF-8 pour les accents (é, à, è, etc.).
- Le moteur de sous-titres (`annotationRenderer.ts`) doit utiliser des bordures (strokes) pour assurer la lisibilité sur tout fond.

### 4. Sécurité et IPC
- Ne créez jamais de nouveaux canaux IPC sans les enregistrer dans `electron/preload.ts`.
- Vérifiez toujours les types des arguments reçus dans `handlers.ts`.

## 🎨 Design & UX (Vibecoding)

- **Esthétique**: Utilisez des gradients sombres, du flou (glassmorphism) et des micro-animations (Framer Motion).
- **Accessibilité**: Chaque bouton interactif **doit** avoir un attribut `title` (infobulle) et des labels ARIA appropriés.
- **Cohérence**: Référez-vous à `src/components/ui/` pour les composants de base (Radix UI).

## 📊 Roadmap & Étapes Suivantes
- Consultez obligatoirement `ROADMAP.md` et `NEXT_STEPS.md` avant de proposer une nouvelle fonctionnalité majeure pour rester aligné avec la vision du produit.

---

> [!CAUTION]
> Toute modification brisant la compatibilité avec l'exportation PixiJS (Web Workers) sera rejetée. Testez toujours le flux d'exportation après modification des filtres ou des annotations.
