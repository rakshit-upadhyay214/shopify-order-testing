const fs = require('fs');
const path = require('path');

// Defaults
let inputFile = 'order_template.json';
let outputFile = null;
let totalOrders = 10;

// --- Argument Parsing ---
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
        inputFile = args[++i];
    } else if (arg === '--output' || arg === '-o') {
        outputFile = args[++i];
    } else if (arg === '--count' || arg === '-n') {
        totalOrders = parseInt(args[++i], 10);
    }
}

// Set default output file if not provided
if (!outputFile) {
    const inputBaseName = path.basename(inputFile, path.extname(inputFile));
    outputFile = path.join('replicated_orders', `${inputBaseName}-copy.json`);
}

function random13DigitId() {
    // Generate a random integer between 10^12 and 10^13 - 1
    const min = 1000000000000;
    const max = 9999999999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMultipleOrders(baseOrders, count) {
    const newOrders = [];

    // Take the first order from the list or the object itself
    const baseOrder = Array.isArray(baseOrders) ? baseOrders[0] : baseOrders;

    if (!baseOrder) {
        throw new Error("No base order found in input file.");
    }

    for (let i = 0; i < count; i++) {
        const orderWrapper = JSON.parse(JSON.stringify(baseOrder));

        // Determine if we need to unwrap the "order" property
        let order = orderWrapper;
        if (orderWrapper.order && typeof orderWrapper.order === 'object' && !orderWrapper.id) {
            order = orderWrapper.order;
        }

        // ---------- Order ID ----------
        const newOrderId = random13DigitId();
        order.id = newOrderId;
        order.admin_graphql_api_id = `gid://shopify/Order/${newOrderId}`;

        if (typeof order.order_number === 'number') {
            order.order_number += (i + 1);
        }
        if (typeof order.number === 'number') {
            order.number += (i + 1);
        }
        if (order.name) {
            order.name = `${order.name}-${i + 1}`;
        }

        // ---------- Line Items ----------
        const lineItemIdMap = {}; // Map old_id -> new_id

        if (Array.isArray(order.line_items)) {
            order.line_items.forEach(item => {
                const oldId = item.id;
                const newItemId = random13DigitId();

                lineItemIdMap[oldId] = newItemId;

                item.id = newItemId;
                item.admin_graphql_api_id = `gid://shopify/LineItem/${newItemId}`;
            });
        }

        // ---------- Fulfillments (if exist) ----------
        if (Array.isArray(order.fulfillments)) {
            order.fulfillments.forEach(fulfillment => {
                fulfillment.order_id = newOrderId;

                if (Array.isArray(fulfillment.line_items)) {
                    fulfillment.line_items.forEach(fItem => {
                        const oldId = fItem.id;
                        if (lineItemIdMap[oldId]) {
                            fItem.id = lineItemIdMap[oldId];
                        }
                    });
                }
            });
        }

        // ---------- Refunds (if exist) ----------
        if (Array.isArray(order.refunds)) {
            order.refunds.forEach(refund => {
                refund.order_id = newOrderId;

                // Refund Transactions
                if (Array.isArray(refund.transactions)) {
                    refund.transactions.forEach(txn => {
                        txn.order_id = newOrderId;
                    });
                }

                // Refund Line Items
                if (Array.isArray(refund.refund_line_items)) {
                    refund.refund_line_items.forEach(rli => {
                        const oldLineItemId = rli.line_item_id;

                        if (lineItemIdMap[oldLineItemId]) {
                            const newLineItemId = lineItemIdMap[oldLineItemId];
                            rli.line_item_id = newLineItemId;

                            if (rli.line_item) {
                                rli.line_item.id = newLineItemId;
                                rli.line_item.admin_graphql_api_id = `gid://shopify/LineItem/${newLineItemId}`;
                            }
                        }
                    });
                }
            });
        }

        newOrders.push(orderWrapper);
    }

    return newOrders;
}

// --- Main Execution ---

try {
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file '${inputFile}' not found.`);
        console.log("Usage: node replicate_orders.js --input <file.json> --output <out.json> --count <number>");
        process.exit(1);
    }

    const rawData = fs.readFileSync(path.resolve(inputFile), 'utf-8');
    const baseOrders = JSON.parse(rawData);

    const outputOrders = generateMultipleOrders(baseOrders, totalOrders);

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.resolve(outputFile), JSON.stringify(outputOrders, null, 2), 'utf-8');

    console.log(`Successfully generated ${totalOrders} orders.`);
    console.log(`Output saved to: ${outputFile}`);

} catch (err) {
    console.error("An error occurred:", err.message);
    process.exit(1);
}
