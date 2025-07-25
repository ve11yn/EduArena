// Migration script to add lives field to existing users
// Run this script to update existing users with the new global lives system

const admin = require('firebase-admin');

// Initialize Firebase Admin (you need to set up service account)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Add your Firebase service account key here
      // For development, you can use the Firebase Admin SDK
    }),
    databaseURL: 'https://your-project-id.firebaseio.com'
  });
}

const db = admin.firestore();

async function migrateUsersLives() {
  try {
    console.log('🔄 Starting migration to add lives field to users...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('📭 No users found to migrate.');
      return;
    }
    
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Only update if lives field doesn't exist
      if (userData.lives === undefined) {
        batch.update(doc.ref, { lives: 3 }); // Give all existing users 3 lives
        count++;
        console.log(`   ✅ Queued user ${userData.username || doc.id} for lives update`);
      } else {
        console.log(`   ⏭️  User ${userData.username || doc.id} already has lives field`);
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${count} users with lives field!`);
    } else {
      console.log('✅ All users already have lives field - no migration needed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// For development testing, you can run this in your Firebase console or as a script
// migrateUsersLives();

module.exports = { migrateUsersLives };
