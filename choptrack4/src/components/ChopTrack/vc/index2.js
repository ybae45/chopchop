import functions, { logger } from 'firebase-functions/v1';
import vision from '@google-cloud/vision';
import admin from 'firebase-admin';
import language from '@google-cloud/language';
import { generateReceiptJSON } from './publix.js';

export const GOOGLE_APPLICATION_CREDENTIALS = "./choptrack-801d8-a19b23f04156.json";
export const RECEIPT_COLLECTION = 'receipts';

admin.initializeApp();

export const readReceiptDetails = functions.storage.object().onFinalize(async (object) => {
  const imageBucket = `gs://${object.bucket}/${object.name}`;
  const client = new vision.ImageAnnotatorClient();
  const languageClient = new language.LanguageServiceClient();

  try {
    // Perform text detection
    const [textDetections] = await client.documentTextDetection(imageBucket);
    const fullTextAnnotation = textDetections.fullTextAnnotation;

    if (!fullTextAnnotation) {
      logger.warn('No text detected in image.');
      return;
    }

    // Extract text and split into lines
    const text = fullTextAnnotation.text;
    const lines = text.split('\n').map(line => line.trim().toLowerCase()).filter(line => line);
    let receiptInfo;

    // Extract Store Name
    const storeNamesToCheck = ['publix', 'kroger']; // List of store names to check
    let storeName = 'unknown'; // Default value

    // Search through the first 10 lines or until a match is found
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      for (const store of storeNamesToCheck) {
        if (lines[i].includes(store)) {
          storeName = lines[i];
          break; // Exit inner loop once a match is found
        }
      }
      if (storeName !== 'unknown') break; // Exit outer loop if a match is found
    }

    // Use regex for publix
    if (storeName.includes('publix')){
        receiptInfo = generateReceiptJSON (text);
        logger.log(receiptInfo);
    }

    // Use NLP for other stores
    else{
      // entities
      const [nlpResult] = await languageClient.analyzeEntities({
        document: {
          content: text,
          type: 'PLAIN_TEXT',
        },
      });

      // 1: Store location
      let storeLoc = "Unknown";
      const locationEntity = nlpResult.entities.find(entity => 
        entity.type === 'LOCATION' 
      );
      if (locationEntity) {
        storeLoc = locationEntity.name; 
      }


      // 2: Shopping date
      let shopDate = "Unknown";

      const dateEntity = nlpResult.entities.find(entity => 
        entity.type === 'DATE' 
      );
      if (dateEntity) {
        shopDate = dateEntity.name; // Extract the date from the entity
      }

      //3: 
      const foodArr = [];  // Array to store the identified food items

      nlpResult.entities.forEach(entity => {
        if (entity.type === 'CONSUMER_GOOD') {
          foodArr.push(entity.name); // Add entity name to foodArr
        }
      });


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

    // Get user ID (object.name format assumed as userID/timestamp)
    // const re = /(.*)\//;
    // const uid = re.exec(object.name)?.[1];

    const documentId = object.name.split('receipt-files/')[1]; 

    // Construct receipt data
    const receipt = {
      receiptInfo: receiptInfo, 
      text,
      imageBucket,
      entryDate: new Date()
    };

    console.log(text);

    // Save receipt data to Firestore
    await admin.firestore().collection(RECEIPT_COLLECTION).doc(documentId).set(receipt);
    logger.log('Receipt data saved to Firestore successfully.');
  } catch (error) {
    logger.error('Error processing receipt:', error.message);
  }
});
