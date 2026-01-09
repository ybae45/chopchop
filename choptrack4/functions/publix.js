/* Import libraries and functions */
import { v4 as uuidv4 } from 'uuid';
export { generateReceiptJSON };

/* Regular expressions to extract store information */
function extractStoreInfo(text) {
    const storeInfo = {};
    const storeNameRegex = /Publix/;
    const locationRegex = /Emory Commons\s*\d+ [A-Za-z\s]+,\s*[A-Za-z]+\s*\d+/;
    const managerRegex = /Store Manager:\s*([A-Za-z\s]+)/;
    const phoneRegex = /\d{3}-\d{3}-\d{4}/;
  
    storeInfo.name = storeNameRegex.test(text) ? "Publix" : "Unknown";
    storeInfo.location = text.match(locationRegex) ? text.match(locationRegex)[0] : "Unknown";
    storeInfo.store_manager = text.match(managerRegex) ? text.match(managerRegex)[1] : "Unknown";
    storeInfo.phone = text.match(phoneRegex) ? text.match(phoneRegex)[0] : "Unknown";
  
    return [storeInfo, storeInfo.phone];
}

/* Regular expressions to extract total cost information */
function extractTotals(text) {
    const totals = {};
    const orderTotalRegex = /Order Total\s*([\d\.]+)/;
    const foodTaxRegex = /Food Tax\s*([\d\.]+)/;
    const grandTotalRegex = /Grand Total\s*([\d\.]+)/;
    //const creditPaymentRegex = /Credit Payment\s*([\d\.]+)/;
    const changeRegex = /Change\s*([\d\.]+)/;
  
    totals.order_total = text.match(orderTotalRegex) ? parseFloat(text.match(orderTotalRegex)[1]) : 0;
    totals.food_tax = text.match(foodTaxRegex) ? parseFloat(text.match(foodTaxRegex)[1]) : 0;
    totals.grand_total = text.match(grandTotalRegex) ? parseFloat(text.match(grandTotalRegex)[1]) : 0;
    //totals.credit_payment = text.match(creditPaymentRegex) ? parseFloat(text.match(creditPaymentRegex)[1]) : 0;
    totals.change = text.match(changeRegex) ? parseFloat(text.match(changeRegex)[1]) : 0;
  
    return totals;
}

/* Regular expressions to extract transaction information */
function extractTransaction(text) {
    const receiptIdRegex = /Receipt ID:\s*([\w\s]+)/;
    const traceNumberRegex = /Trace #:\s*(\d+)/;
    const referenceNumberRegex = /Reference #:\s*(\d+)/;
    const accountNumberRegex = /Acct #:\s*([\w]+)/;
    const purchaseTypeRegex = /Purchase\s*(\w+)/;
    const amountPaidRegex = /Amount:\s*\$(\d+\.\d{2})/;
    const authorizationNumberRegex = /Auth #:\s*([\w\d]+)/;
    const creditCardRegex = /CREDIT CARD/;
    const modeRegex = /Mode:\s*([\w\s]+)/;
    const cashierRegex = /Your cashier was\s*(.*?)(?=\s\d{2}\/\d{2}\/\d{4})/;  // Extracting the cashier info
    const dateTimeRegex = /(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/;


    const dateTimeMatch = text.match(dateTimeRegex);

    return {
        receipt_id: (text.match(receiptIdRegex) || [])[1] || 'Unknown',
        trace_number: (text.match(traceNumberRegex) || [])[1] || 'Unknown',
        reference_number: (text.match(referenceNumberRegex) || [])[1] || 'Unknown',
        account_number: (text.match(accountNumberRegex) || [])[1] || 'Unknown',
        purchase_type: (text.match(purchaseTypeRegex) || [])[1] || 'Unknown',
        amount_paid: (text.match(amountPaidRegex) || [])[1] || 'Unknown',
        authorization_number: (text.match(authorizationNumberRegex) || [])[1] || 'Unknown',
        credit_card: (text.match(creditCardRegex) ? 'CREDIT CARD' : 'Unknown'),
        mode: (text.match(modeRegex) || [])[1] || 'Unknown',
        cashier: (text.match(cashierRegex) || [])[1] || 'Unknown',
        datetime: dateTimeMatch[0]
      };
}

/* Helper function of extractItems w/ Regular expressions to extract details for each item*/
function parseItem(details) {
    const itemDetails = {
        id: uuidv4(), // generates unique ID for Publix items
        cost: null,
        quantity: null,
        unit: null,
        unitPrice: null,
        savings: null,
        other: null // store non-matched parts of strings
    };

    // Series of cases: each time if it matches, the text is trimmed, the remaining text continues 

    // Simple case: If there is only one number and it is a decimal, it is the cost and return
    const numberMatch = details.match(/\d+\.\d+/g);

    if (numberMatch && numberMatch.length === 1) {
        itemDetails.cost = parseFloat(numberMatch[0]);
        //console.log("simple");
        return itemDetails;
    }

    // Case 1: savings --> "You Saved" followed by spaces and a decimal number
    const savingsMatch = details.match(/You Saved\s+(\d+\.\d+)/);

    if (savingsMatch) {
        itemDetails.savings = parseFloat(savingsMatch[1]);
        details = details.replace(/You Saved\s+\d+\.\d+/, '').trim();
    }

    // Case 2: promotions --> "Promotions" followed by negative number
    if (/Promotion/.test(details)) {
        const promotionMatch = details.match(/Promotion\s+-\d+\.\d+/);
    
        if (promotionMatch) {
            const savingsMatch = promotionMatch[0].match(/-\d+\.\d+/);
    
            if (savingsMatch) {
                itemDetails.savings = Math.abs(parseFloat(savingsMatch[0])); // Save the absolute value
                details = details.replace(promotionMatch[0], '').trim(); 
            }
        }
    }

    // Case 3: sales ex. 2 for 1.50
    if (details.includes("FOR")) {
        const lastDecimalMatch = details.match(/(\d+\.\d+)(?=\s*(?:\D*$))/);
    
        if (lastDecimalMatch) {
            itemDetails.cost = parseFloat(lastDecimalMatch[1]); // Save the last decimal number as cost
            details = details.replace(lastDecimalMatch[0], '').trim();
    
            // Save the rest of the string as 'other'
            itemDetails.other = details;
        }
    }

    // Case 4: includes @ and / --> represents quantity, unit, price
    if (details.includes("@") && details.includes("/")) {
        const match = details.match(/(\d+(\.\d+)?)\s+([a-zA-Z]+)\s*@\s*(\d+(\.\d+)?)\s*\/\s*([a-zA-Z]+)/);

        if (match) {
            itemDetails.quantity = parseFloat(match[1]); 
            itemDetails.unit = match[3];               
            itemDetails.unitPrice = {
                price: parseFloat(match[4]),           
                unit: match[6]                     
            };
            details = details.replace(match[0], "").trim();   
        }    
    }

    // Hopefully by now, only cost is left --> check if there's only one decimal number left in details
    const remainingNumberMatch = details.match(/\d+\.\d+/g);

    if (remainingNumberMatch && remainingNumberMatch.length === 1) {
        if (itemDetails.cost === null){
            itemDetails.cost = parseFloat(remainingNumberMatch[0]); // Save as cost
            details = details.replace(remainingNumberMatch[0], '').trim(); 
        }
        return itemDetails;
    }

    // If still no matches, default: save the last decimal number as the cost and the rest in 'other'
    const lastDecimalMatch = details.match(/(\d+\.\d+)(?=\s*(?:\D*$))/);

    if (itemDetails.cost === null) {

        if (lastDecimalMatch) {
            itemDetails.cost = parseFloat(lastDecimalMatch[1]);
            details = details.replace(lastDecimalMatch[0], '').trim();
        }
    }
    itemDetails.other = details;

    return itemDetails; 
}

/* Function to extract names of items */
function extractItems(text) {
    // Item names are capitalized
    const items = {};
    let itemNames = [];
    let itemNum = 0;
    let itemIndex = [];
    const regex = /([\p{Lu}\s/]+)\s(\d+(?:\.\d+)?)/gu;

    [...text.matchAll(regex)].forEach(match => {
        let item = match[1].trim();

        if (item !== "" && item !== "FOR") { // Remove empty string and 'FOR'
            itemNames.push(item);
        }
    });

    // Store number of items in receipt
    itemNum = itemNames.length
    
    // If items found, then iterate and break item receipt section into text for each item
    if (itemNum >= 1) {
        let index = 0;
        let copytext = text;

        // Find index for each item from the receipt section
        itemNames.forEach(item => {
            const subIndex = copytext.indexOf(item); 

            itemIndex.push(index + subIndex + item.length);

            index += (subIndex + item.length);

            copytext = copytext.substring(subIndex+item.length);
        });

        // Add end points to allow for last item
        itemIndex.push(text.length); 
        itemNames.push(""); 

        // For each interval, use helper function parseItem to find details for each item
        for (let i = 0; i < itemNum; i++){
            let intervalstr = text.substring(itemIndex[i], itemIndex[i+1] - itemNames[i+1].length);
            const parsedItem = parseItem(intervalstr);
            itemNames[i] = itemNames[i].replace(/\bF\s/g, "");

            // Manage duplicate items
            if (items[itemNames[i]]) {
                // Aggregate cost and quantity if they exist
                const existingItem = items[itemNames[i]];
                if (parsedItem.cost !== null) {
                    existingItem.cost = (existingItem.cost || 0) + (parsedItem.cost || 0);
                }

                // Update quantity
                if (parsedItem.quantity === null && existingItem.quantity == null){
                    existingItem.quantity = 2;
                } else if (existingItem.quantity != null){
                    existingItem.quantity += 1;
                } else if (parsedItem.quantity !== null) {
                    existingItem.quantity = (existingItem.quantity || 0) + parsedItem.quantity;
                }

                // Aggregate savings
                existingItem.savings = (existingItem.savings || 0) + (parsedItem.savings || 0);

            } else {
                // Add item to JSON
                items[itemNames[i]] = parsedItem;
            }
        }
    }
    return items;
}

/* Main function to generate receipt JSON from converted text */
function generateReceiptJSON(receiptText) {
    // JSON: Store section
    const [store, phoneNumber] = extractStoreInfo(receiptText);
    const itemsIndex = receiptText.indexOf(phoneNumber) + phoneNumber.length;

    // JSON: Item section
    const totalIndex = receiptText.indexOf('Order Total');
    const itemString = receiptText.substring(itemsIndex, totalIndex);
    const items = extractItems(itemString);

    // JSON: Totals section
    const totalString = receiptText.substring(totalIndex);
    const totals = extractTotals(totalString);
    
    // JSON: Transaction section
    const tIndex = totalString.indexOf('Receipt ID');
    const transString = totalString.substring(tIndex);
    const transaction = extractTransaction(transString);
  
    // Construct the JSON structure
    const receiptJSON = {
        store: store,
        items: items, 
        total: totals,
        transaction: transaction
    };
  
    // Return JSON
    return receiptJSON;
}

