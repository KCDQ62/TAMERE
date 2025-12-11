#!/bin/bash
# Supprimer toutes les balises de code incorrectes

echo "🧹 Nettoyage des fichiers..."

# Fonction pour nettoyer un fichier
clean_file() {
    if [ -f "$1" ]; then
        # Supprimer les lignes avec ```javascript, javascript seul, ou ```
        sed -i '/^```javascript$/d; /^javascript$/d; /^```$/d' "$1"
        echo "✅ Nettoyé: $1"
    else
        echo "⚠️  Fichier non trouvé: $1"
    fi
}

# Nettoyer tous les fichiers
find . -name "*.js" -type f | while read file; do
    clean_file "$file"
done

echo "🎉 Nettoyage terminé !"