/* Import libraries and functions */
import functions, { logger } from 'firebase-functions/v1';
import vision from '@google-cloud/vision';
import admin from 'firebase-admin';
import language from '@google-cloud/language';
import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';
import { generateReceiptJSON } from './publix.js';

admin.initializeApp();

/* Function 1: readReceiptDetails 
  - Firebase function activated by storing receipt in Firebase Storage
  - Use Google Vision to parse image into text
  - Extract store name
    - If store = Publix, run regex code
    - Else, use Google Language entity recognition
  - Create JSON format of receipt 
  - Store into Firestore
*/
export const GOOGLE_APPLICATION_CREDENTIALS = "./choptrack-801d8-a19b23f04156.json";
export const RECEIPT_COLLECTION = 'receipts';

export const readReceiptDetails = functions.storage.object().onFinalize(async (object) => {
  const imageBucket = `gs://${object.bucket}/${object.name}`;
  const client = new vision.ImageAnnotatorClient();
  const languageClient = new language.LanguageServiceClient();

  try {
    // Extract userId from storage path (users/{uid}/receipts/{fileName})
    const pathParts = object.name.split('/');
    //logger.log(pathParts);
    const userId = pathParts[1]; // userData.uid
    const fileName = pathParts[3]; // File name with UUID and original file name

    // Google Vision to parse JPG/PNG of receipt into text
    const [textDetections] = await client.documentTextDetection(imageBucket);
    const fullTextAnnotation = textDetections.fullTextAnnotation;

    if (!fullTextAnnotation) {
      logger.warn('No text detected in image.');
      return;
    }

    const text = fullTextAnnotation.text;
    const lines = text.split('\n').map(line => line.trim().toLowerCase()).filter(line => line);
    let receiptInfo;

    // Extract Store Name
    const storeNamesToCheck = ['publix', 'kroger']; 
    let storeName = 'unknown'; 

    // Search first 10 lines for match
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      for (const store of storeNamesToCheck) {
        if (lines[i].includes(store)) {
          storeName = lines[i];
          break; 
        }
      }
      if (storeName !== 'unknown') break; 
    }

    // Call regular expression function in /publix.js to parse Publix receipts
    if (storeName.includes('publix')){
        receiptInfo = generateReceiptJSON (text);
    }

    // Use Google Language API for other stores
    else {
      // Entity analysis
      const [nlpResult] = await languageClient.analyzeEntities({
        document: {
          content: text,
          type: 'PLAIN_TEXT',
        },
      });

      // 1: Store location
      let storeLoc = '';
      // If store name previously determined to Kroger
      if (storeName != 'unknown') {
        storeLoc = storeName;
      }
      else {
        // Other stores: use entity type = location
        const locationEntity = nlpResult.entities.find(entity => 
          entity.type === 'LOCATION' 
        );
        if (locationEntity) {
          storeLoc = locationEntity.name; 
        }
      }

      // 2: Shopping date: search for entity type = date
      let shopDate = "Unknown";
      const dateEntity = nlpResult.entities.find(entity => 
        entity.type === 'DATE' 
      );
      if (dateEntity) {
        shopDate = dateEntity.name; 
      }

      //3: Grocery items extraction: search for entity type =  consumer good
      const items = {};
      nlpResult.entities.forEach(entity => {
        if (entity.type === 'CONSUMER_GOOD') {
          const itemName = entity.name.toLowerCase();
          items[itemName] = {
            id: uuidv4(),  // generate unique ID for each item
            cost: null,    
            other: null,    
            quantity: null, 
            savings: null,  
            unit: null,     
            unitPrice: null 
          }; 
        }
      });

      // Structure of receipt parsed from Kroger / other stores
      receiptInfo = {
        store: {
          name: storeName,
          location: storeLoc
        }, 
        items: items, // Update with the extracted items
        transaction: {
          datetime: shopDate,
          extracted: nlpResult
        }
      };
    }

    // Firestore path to save parsed receipts:
    const documentId = fileName.split('_')[0];

    // Construct receipt data
    const receipt = {
      receiptInfo: receiptInfo, 
      text,
      imageBucket,  // Store Firebase Storage path
      entryDate: new Date()
    };

    // Save receipt data in Firestore
    await admin.firestore()
      .collection('users')
      .doc(userId)  // User document based on userId extracted from storage path
      .collection('receipts')  // Receipts subcollection for the specific user
      .doc(documentId)  // Use the file name as the document ID
      .set(receipt);
    logger.log('Receipt data saved to Firestore successfully.');

  } catch (error) {
    logger.error('Error processing receipt:', error.message);
  }
});

/* Function 2: Twilio sendDailyReminders
  - Run daily at 8 AM EST (timezone: America/New_York)
  - Checks Firestore 'fridge' for reminderDate on the same day
  - Uses Twilio to send message to user
*/

// Twilio Configuration
const TWILIO_ACCOUNT_SID = 'AC546c114b85a2dca1354cf18767801b4c';
const TWILIO_AUTH_TOKEN = 'b65d403f804e3e58815aabf0bf608640';
const TWILIO_PHONE_NUMBER = '+18883052385';

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const sendDailyReminders = functions.pubsub
  .schedule('0 8 * * *')  // Schedules the function to run every day at 8:50 AM
  .timeZone('America/New_York')
  .onRun(async (context) => {
    // Set start and end times for the day
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    try {
      // Fetch all user profiles
      const usersSnapshot = await admin.firestore().collection('userProfile').get();

      if (usersSnapshot.empty) {
        logger.log('No user profiles found.');
        return;
      }

      // Process reminders for each user concurrently
      const reminderPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        logger.log(`Processing reminders for userId: ${userId}`);

        // Fetch phone number
        const { phoneNumber } = userDoc.data();
        if (!phoneNumber) {
          logger.warn(`User ${userId} does not have a phone number.`);
          return;
        }

        // Query fridge items for the current user
        const fridgeRef = admin.firestore().collection('users').doc(userId).collection('fridge');
        const snapshot = await fridgeRef
          .where('reminderDate', '>=', startOfDay)
          .where('reminderDate', '<=', endOfDay)
          .get();

        if (snapshot.empty) {
          logger.log(`No items with reminders found for user ${userId} today.`);
          return;
        }

        const reminders = snapshot.docs.map(doc => doc.data().itemName);

        // Send Twilio message
        const messageBody = `Good morning! Here are your daily reminders for today:\n- ${reminders.join('\n- ')}`;
        await twilioClient.messages.create({
          from: TWILIO_PHONE_NUMBER,
          to: phoneNumber,
          body: messageBody,
        });

        logger.log(`Reminder sent to ${phoneNumber} for user ${userId}`);
      });

      // Wait for all promises to complete
      await Promise.all(reminderPromises);

      logger.log('All reminders processed successfully.');
    } catch (error) {
      logger.error('Error sending daily reminders:', error.message);
    }
  });


/* Function 3: Twilio sendRemindsOnChange
  - Activated by updates to Firestore 'fridge'
  - Checks Firestore 'fridge' for reminderDate on the same day
  - Uses Twilio to send message to user
*/

export const sendRemindersOnChange = functions.firestore
  .document('users/{userId}/fridge/{itemId}')  // Adjust Firestore path according to your structure
  .onWrite(async (change, context) => {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    try {
      const afterData = change.after.exists ? change.after.data() : null;

      if (!afterData || !afterData.reminderDate) {
        logger.log('No valid reminder data found in the change.');
        return;
      }

      const reminderDate = new Date(afterData.reminderDate.toDate());
      const isDueToday = reminderDate >= startOfDay && reminderDate <= endOfDay;

      if (!isDueToday) {
        logger.log('No reminders due today based on the change.');
        return;
      }

      const userId = context.params.userId;  // Get the userId from Firestore path
      logger.log(`Fetching reminders for userId: ${userId}`);

      const fridgeRef = admin.firestore().collection('users').doc(userId).collection('fridge');
      const snapshot = await fridgeRef
        .where('reminderDate', '>=', startOfDay)
        .where('reminderDate', '<=', endOfDay)
        .get();

      if (snapshot.empty) {
        logger.log('No items with reminders due today.');
        return;
      }

      // Fetch phone number from 'userProfile/{userId}' collection
      logger.log(`Fetching user profile phone number for userId: ${userId}`);
      const userProfileDocRef = admin.firestore().collection('userProfile').doc(userId);  
      const userProfileDoc = await userProfileDocRef.get();

      if (!userProfileDoc.exists) {
        logger.error(`User profile document for ${userId} does not exist.`);
        return;
      }

      const { phoneNumber } = userProfileDoc.data();  
      if (!phoneNumber) {
        logger.warn(`User ${userId} does not have a phone number.`);
        return;
      }

      // Build the reminder message
      let messageBody = `Good morning! Here are your reminders for today:\n`;

      snapshot.forEach((doc) => {
        const itemData = doc.data();
        messageBody += `- ${itemData.itemName}\n`;
      });

      // Send reminder via Twilio
      logger.log(`Sending reminder message to ${phoneNumber}`);
      await twilioClient.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        body: messageBody,
      });

      logger.log(`Reminder sent to ${phoneNumber}`);

    } catch (error) {
      logger.error('Error sending reminders on Firestore change:', error.message);
      throw error;  // Rethrow the error so that it gets logged in Firebase functions logs
    }
  });

