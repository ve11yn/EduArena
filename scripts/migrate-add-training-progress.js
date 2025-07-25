// Migration script to add training progress field to existing users
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../service-account-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrateUsers() {
  try {
    console.log('🔄 Starting migration to add training progress...');
    
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('ℹ️ No users found');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    // Initial training progress with first level unlocked for each subject
    const initialProgress = {
      math: {
        "1": { progress: 0, totalQuestions: 15, completed: false, unlocked: true }
      },
      bahasa: {
        "1": { progress: 0, totalQuestions: 15, completed: false, unlocked: true }
      },
      english: {
        "1": { progress: 0, totalQuestions: 15, completed: false, unlocked: true }
      }
    };

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      if (userData.trainingProgress) {
        console.log(`⏭️ User ${doc.id} already has training progress, skipping...`);
        skippedCount++;
        continue;
      }

      await doc.ref.update({
        trainingProgress: initialProgress
      });

      console.log(`✅ Added training progress to user ${doc.id}`);
      migratedCount++;
    }

    console.log(`🎉 Migration completed!`);
    console.log(`   - Migrated: ${migratedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users (already had training progress)`);
    console.log(`   - Total: ${usersSnapshot.size} users processed`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateUsers().then(() => {
  console.log('🏁 Migration script finished');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
