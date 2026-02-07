const fs = require('fs');
const path = require('path');

let inputFile = null;
let totalOrders = 1;
let shouldUpload = false;
const MOQUI_URL = "https://krewe-maarg-uat.hotwax.io/rest/s1/admin/uploadDataManagerFile";
const MOQUI_TOKEN = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyTG9naW5JZCI6InNob3BpZnkuaW50ZWdyYXRpb24iLCJwdXJwb3NlIjoidGVzdCIsImlzc3VlZEJ5IjoiSG90d2F4IFVzZXIiLCJpc3MiOiJrcmV3ZS11YXQiLCJleHAiOjE3NzI4OTk1MTQsImNhdGVnb3J5IjoiSU5URUdSQVRJT04iLCJpYXQiOjE3NzAzMDc1MTR9.sd4tsfCdw9OcQup1zXzVtwliAfh1ai28jK23KXvyKUpc1dsHO6kVMnE5ygjEm-R-wP0rA_AFwjbcf_25WxCccA";

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
        inputFile = args[++i];
    } else if (arg === '--count' || arg === '-n') {
        totalOrders = parseInt(args[++i], 10);
    } else if (arg === '--upload' || arg === '-u') {
        shouldUpload = true;
    }
}

if (!inputFile) {
    console.error("Error: Input file must be provided via --input or -i");
    process.exit(1);
}

const inputBaseName = path.basename(inputFile, path.extname(inputFile));

const now = new Date();
const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0];
const outputDir = 'replicated_orders';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputFile = path.join(outputDir, `${inputBaseName}_${timestamp}.json`);


function generateRandomId() {
    // Generate a random integer between 10^12 and 10^13 - 1
    const min = 1000000000000;
    const max = 9999999999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function uploadToMoqui(filePath, url, token) {
    console.log(`\nStarting upload to ${url}...`);
    try {
        const fileContent = fs.readFileSync(filePath); // Read as buffer
        const fileName = path.basename(filePath);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const formData = new FormData();
        formData.append('configId', 'ShopifyOrdersWebhook');
        formData.append('contentFile', blob, fileName);

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`; // Or Basic, depending on requirements. Defaulting to Bearer or just passing the token.
            // If token contains 'Basic ', use it as is.
            if (!token.startsWith('Basic ') && !token.startsWith('Bearer ')) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                headers['Authorization'] = token;
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json(); // Assuming JSON response
        console.log("Upload successful!", result);

    } catch (error) {
        console.error("Upload Error:", error.message);
    }
}

function replicateOrder(orderData, uniqueMap, iterationIndex) {
    const newOrder = JSON.parse(JSON.stringify(orderData));

    // Helper to get or create new ID for a given old ID
    const getNewIdData = (oldId) => {
        if (!uniqueMap.has(oldId)) {
            const newNumeric = generateRandomId();
            let newGid = oldId;
            const gidMatch = oldId.match(/^(gid:\/\/shopify\/[^\/]+\/)(.*)$/);
            if (gidMatch) {
                newGid = `${gidMatch[1]}${newNumeric}`;
            } else {
                if (/^\d+$/.test(oldId)) {
                    newGid = newNumeric.toString();
                }
            }
            uniqueMap.set(oldId, { gid: newGid, numeric: newNumeric });
        }
        return uniqueMap.get(oldId);
    };

    const typesToReplace = new Set([
        'Order', 'LineItem', 'Refund', 'RefundLineItem',
        'Return', 'ReturnLineItem', 'OrderTransaction',
        'ExchangeLineItem', 'ReverseFulfillmentOrder',
        'ReverseFulfillmentOrderDisposition', 'SalesAgreement',
        'OrderAgreement', 'ReturnAgreement', 'RefundAgreement',
        'FulfillmentLineItem', 'Fulfillment'
    ]);

    const traverse = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        if (obj.id && typeof obj.id === 'string') {
            const match = obj.id.match(/gid:\/\/shopify\/([^\/]+)\//);
            if (match && typesToReplace.has(match[1])) {
                const newIdData = getNewIdData(obj.id);
                obj.id = newIdData.gid;

                if (obj.legacyResourceId) {
                    obj.legacyResourceId = newIdData.numeric.toString();
                }
            }
        }

        if (obj.number !== undefined && typeof obj.number === 'number') {
            obj.number = obj.number + (iterationIndex * 10000) + Math.floor(Math.random() * 9000);
        }

        if (obj.name && typeof obj.name === 'string') {
            if (obj.name.startsWith('#')) {
                const randomSuffix = Math.floor(Math.random() * 100);
                obj.name = `${obj.name}-${randomSuffix}`;
            }
        }

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                const valMatch = obj[key].match(/gid:\/\/shopify\/([^\/]+)\//);
                if (valMatch && typesToReplace.has(valMatch[1])) {
                    const newIdData = getNewIdData(obj[key]);
                    obj[key] = newIdData.gid;
                }
            }
            traverse(obj[key]);
        }
    };

    traverse(newOrder);
    return newOrder;
}

try {
    if (!fs.existsSync(inputFile)) {
        throw new Error(`Input file '${inputFile}' not found.`);
    }

    const rawData = fs.readFileSync(inputFile, 'utf-8');
    const baseOrders = JSON.parse(rawData);

    const inputSequence = Array.isArray(baseOrders) ? baseOrders : [baseOrders];

    const finalExecutionList = [];

    for (let i = 0; i < totalOrders; i++) {
        const iterationMap = new Map();

        for (const stepPayload of inputSequence) {
            const newStep = replicateOrder(stepPayload, iterationMap, i);
            newStep.shopId = "SHOP";
            finalExecutionList.push(newStep);
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(finalExecutionList, null, 4));
    console.log(`Generated ${finalExecutionList.length} total payloads.`);
    console.log(`(Source had ${inputSequence.length} steps, replicated ${totalOrders} times)`);
    console.log(`Saved to ${outputFile}`);

    if (shouldUpload) {
        if (!MOQUI_URL) {
            console.error("Error: MOQUI_URL is not configured in the script. Please update the hardcoded constant.");
        } else {
            uploadToMoqui(outputFile, MOQUI_URL, MOQUI_TOKEN);
        }
    }

} catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
}
