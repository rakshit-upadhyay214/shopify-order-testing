const fs = require('fs');
const path = require('path');

let inputFile = null;
let totalOrders = 1;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
        inputFile = args[++i];
    } else if (arg === '--count' || arg === '-n') {
        totalOrders = parseInt(args[++i], 10);
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
                const randomSuffix = Math.floor(Math.random() * 10000);
                // Prevent infinite appending by taking only the base name (first part before '-')
                const baseName = obj.name.split('-')[0];
                obj.name = `${baseName}-${iterationIndex}-${randomSuffix}`;
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

} catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
}
