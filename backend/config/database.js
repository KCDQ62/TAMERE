const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log('⚠️  MONGODB_URI non défini');
      console.log('💡 Pour configurer MongoDB:');
      console.log('   1. Créez un cluster sur https://mongodb.com/cloud/atlas');
      console.log('   2. Ajoutez MONGODB_URI dans les variables Railway');
      console.log('   3. Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname');
      return;
    }
    
    console.log('🔌 Connexion à MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📦 Base de données: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB déconnecté');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnecté');
    });

  } catch (error) {
    console.error('❌ Connexion MongoDB échouée:', error.message);
    console.log('⚠️  Le serveur continuera sans MongoDB');
  }
};

module.exports = connectDB;