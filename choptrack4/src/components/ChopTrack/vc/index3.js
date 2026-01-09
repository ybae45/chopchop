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
    console.log(pathParts);
    logger.log(pathParts);
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
      const foodArr = [];
      nlpResult.entities.forEach(entity => {
        if (entity.type === 'CONSUMER_GOOD') {
          foodArr.push({
            id: uuidv4(),  // generate unique ID for each item
            name: entity.name, 
          }); 
        }
      });

      // Structure of receipt parsed from Kroger / other stores
      receiptInfo = {
        store: {
          name: storeName, 
          location: storeLoc
        }, 
        items: {
          foodArr
        }, 
        transaction:{
          datetime: shopDate
        }
      }
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
  .schedule('0 8 * * *') 
  .timeZone('America/New_York')
  .onRun(async (context) => {

    // Create date object for current day
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    try {
      const fridgeRef = admin.firestore().collection('fridge');
      const snapshot = await fridgeRef
        .where('reminderDate', '>=', startOfDay)
        .where('reminderDate', '<=', endOfDay)
        .get();

      if (snapshot.empty) {
        logger.log('No items with reminders found for today.');
        return;
      }

      // Group reminders
      const reminders = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const { itemName } = data;
        reminders.push(itemName);
      });

      /* 
      get phone number: 
      const usersCollection = collection(db, 'userProfile');
      const docRef = doc(usersCollection, authUser.uid);
      doc.get(phoneNumber);
      
      */

      if (reminders.length > 0) {
        const messageBody = `Good morning! Here are your reminders for today:\n- ${reminders.join('\n- ')}`;
        await twilioClient.messages.create({
          from: TWILIO_PHONE_NUMBER,
          to: TEST_PHONE_NUMBER, // Hard-coded phone number
          body: messageBody,
        });

        logger.log('Daily reminder sent successfully.');
      }
    } catch (error) {
      logger.error('Error sending reminders:', error.message);
    }
  });

/* Function 3: Twilio sendRemindsOnChange
  - Activated by updates to Firestore 'fridge'
  - Checks Firestore 'fridge' for reminderDate on the same day
  - Uses Twilio to send message to user
*/
export const sendRemindersOnChange = functions.firestore
  .document('fridge/{itemId}')
  .onWrite(async (change, context) => {
    // Create a date object for the current day
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    try {
      // Check for reminderDate in fridge
      const afterData = change.after.exists ? change.after.data() : null;
      
      if (!afterData || !afterData.reminderDate) {
        logger.log('No valid reminder data found in the change.');
        return;
      }

      // Convert Firestore Timestamp to Date and check if it's due today
      const reminderDate = new Date(afterData.reminderDate.toDate());
      const isDueToday =
        reminderDate >= startOfDay && reminderDate <= endOfDay;

      if (!isDueToday) {
        logger.log('No reminders due today based on the change.');
        return;
      }

      // Query Firestore for all items due today
      const fridgeRef = admin.firestore().collection('fridge');
      const snapshot = await fridgeRef
        .where('reminderDate', '>=', startOfDay)
        .where('reminderDate', '<=', endOfDay)
        .get();

      if (snapshot.empty) {
        logger.log('No items with reminders due today.');
        return;
      }

      // Get user phone number
      /*
      // Map to store items grouped by user UID
      const userReminders = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const { userId, itemName } = data;

        if (!userId) {
          logger.warn(`Item "${itemName}" does not have a user ID associated.`);
          return;
        }

        // Fetch the user's phone number from Firebase Authentication
        admin.auth().getUser(userId)
          .then(userRecord => {
            const userPhone = userRecord.phoneNumber;

            if (!userPhone) {
              logger.warn(`User with UID "${userId}" does not have a phone number.`);
              return;
            }

            if (!userReminders.has(userPhone)) {
              userReminders.set(userPhone, []);
            }

            userReminders.get(userPhone).push(itemName);
          })
          .catch(error => {
            logger.error(`Error fetching user info for UID "${userId}": ${error.message}`);
          });
      });

      */
     // Wait for all phone numbers to be retrieved and send messages
     await Promise.all([...userReminders].map(async ([phone, items]) => {
      const messageBody = `Good morning! Here are your reminders for today:\n- ${items.join('\n- ')}`;

      try {
        await twilioClient.messages.create({
          from: TWILIO_PHONE_NUMBER,
          to: phone,
          body: messageBody,
        });

        logger.log(`Reminder sent for items due today to ${phone}`);
      } catch (error) {
        logger.error(`Error sending message to ${phone}: ${error.message}`);
      }
    }));

    // Delete the notifications from the fridge collection
    const deletePromises = [];
    snapshot.forEach((doc) => {
      const docId = doc.id;
      deletePromises.push(fridgeRef.doc(docId).delete());
    });

    await Promise.all(deletePromises);
    logger.log('Sent reminders and deleted items from the fridge collection.');
      
    } catch (error) {
      logger.error('Error sending reminders on Firestore change:', error.message);
    }
  });

/*export const sendRemindersOnChange = functions.firestore
  .document('fridge/{itemId}')
  .onWrite(async (change, context) => {

    // Creates date object of current day
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)); 
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)); 

    try {
      // Checks for reminderDate in fridge
      const afterData = change.after.exists ? change.after.data() : null;
      
      if (!afterData || !afterData.reminderDate) {
        logger.log('No valid reminder data found in the change.');
        return;
      }

      // Convert Firestore Timestamp to Date and checks if on current day
      const reminderDate = new Date(afterData.reminderDate.toDate()); 
      const isDueToday =
        reminderDate >= startOfDay &&
        reminderDate <= endOfDay;

      if (!isDueToday) {
        logger.log('No reminders due today based on the change.');
        return;
      }

      // Constructs message for item
      const { itemName } = afterData;
      const messageBody = `Reminder: Your item "${itemName}" is due today!`;

      // Sends message with Twilio
      await twilioClient.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to: TEST_PHONE_NUMBER, //!!!!!!!!!!!!!! tmp phone 
        body: messageBody,
      });

      logger.log(`Reminder sent for item "${itemName}" to ${TEST_PHONE_NUMBER}`);
    } catch (error) {
      logger.error('Error sending reminder on Firestore change:', error.message);
    }
});*/