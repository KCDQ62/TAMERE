#!/usr/bin/env node

/**
 * Script de vérification des variables d'environnement
 * Exécuter avec: node scripts/check-env.js
 */

require('dotenv').config();

console.log('\n🔍 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT\n');
console.log('='.repeat(60));

const required = [
  { key: 'NODE_ENV', value: process.env.NODE_ENV },
  { key: 'PORT', value: process.env.PORT },
  { key: 'MONGODB_URI', value: process.env.MONGODB_URI, sensitive: true },
  { key: 'JWT_SECRET', value: process.env.JWT_SECRET, sensitive: true },
];

const optional = [
  { key: 'JWT_EXPIRE', value: process.env.JWT_EXPIRE },
  { key: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID, sensitive: true },
  { key: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY, sensitive: true },
  { key: 'CLIENT_URL', value: process.env.CLIENT_URL },
  { key: 'FRONTEND_URL', value: process.env.FRONTEND_URL },
];

let hasErrors = false;

console.log('\n📋 Variables obligatoires:\n');
required.forEach(({ key, value, sensitive }) => {
  if (!value) {
    console.log(`❌ ${key}: MANQUANT`);
    hasErrors = true;
  } else {
    const displayValue = sensitive 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
});

console.log('\n📋 Variables optionnelles:\n');
optional.forEach(({ key, value, sensitive }) => {
  if (!value) {
    console.log(`⚠️  ${key}: Non défini (optionnel)`);
  } else {
    const displayValue = sensitive 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ ERREUR: Variables obligatoires manquantes\n');
  console.log('💡 Pour corriger:');
  console.log('   1. Copiez .env.example vers .env');
  console.log('   2. Remplissez les valeurs manquantes');
  console.log('   3. Pour Railway: ajoutez les variables dans les settings\n');
  process.exit(1);
} else {
  console.log('\n✅ Toutes les variables obligatoires sont définies\n');
  process.exit(0);
}