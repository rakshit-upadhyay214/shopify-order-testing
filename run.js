const newman = require('newman');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Argument Parser ---
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--collection' || arg === '-c') {
            config.collectionPath = args[++i];
        } else if (arg === '--scenario' || arg === '-s' || arg === '--data' || arg === '-d') {
            config.scenarioPath = args[++i];
        }
    }
    return config;
}

const config = parseArgs();

if (!config.collectionPath || !config.scenarioPath) {
    console.error('Usage: node run.js --collection <collection_file> --scenario <scenario_file>');
    console.error('Options:');
    console.error('  --collection, -c   Path to the Postman collection JSON file');
    console.error('  --scenario, -s     Path to the data/scenario JSON file (alias: --data, -d)');
    process.exit(1);
}

// --- Configuration ---
const collectionFile = config.collectionPath;
const scenarioFile = config.scenarioPath;
const scenarioName = path.basename(scenarioFile, '.json');

const ordersDir = 'orders';
const snapshotsDir = 'snapshots';

// --- Ensure Directories Exist ---
[ordersDir, snapshotsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

console.log(`\n--- Configuration ---`);
console.log(`Collection: ${collectionFile}`);
console.log(`Scenario:   ${scenarioFile}`);
console.log(`Orders Dir: ${ordersDir}`);
console.log(`Snapshots:  ${snapshotsDir}`);
console.log(`---------------------\n`);

// --- Environment Setup ---
const environmentFile = 'shopify_env.json';
let shopName, accessToken, apiVersion;

try {
    // Attempt to load environment variables for order downloading
    const envPath = path.resolve(__dirname, environmentFile);
    if (fs.existsSync(envPath)) {
        const envData = require(envPath);
        const getEnv = (key) => envData.values.find(v => v.key === key)?.value;
        shopName = getEnv('shopName');
        accessToken = getEnv('accessToken');
        apiVersion = getEnv('apiVersion') || '2024-01';
    }
} catch (error) {
    console.warn(`Warning: Could not load environment file '${environmentFile}'. Order downloads might fail.`);
}

let currentOrderId = null;

// --- Run Collection ---
(async () => {
    try {
        await runNewman();
    } catch (error) {
        console.error('Execution Failed:', error);
        process.exit(1);
    }
})();

function runNewman() {
    return new Promise((resolve, reject) => {
        newman.run({
            collection: require(path.resolve(collectionFile)),
            environment: require(path.resolve(environmentFile)),
            iterationData: require(path.resolve(scenarioFile)),
            reporters: 'cli',
            reporter: {
                cli: {
                    noSummary: false,
                    noAssertions: false
                }
            }
        })
            .on('start', () => {
                console.log('Newman run started...');
            })
            .on('console', (err, args) => handleConsoleLog(args))
            .on('iteration', (err, args) => handleIteration(err))
            .on('done', (err, summary) => {
                if (err || summary.error) {
                    console.error(`\nRun failed for ${collectionFile}.`);
                } else {
                    console.log(`\nRun complete for ${collectionFile}.`);
                }
                resolve();
            });
    });
}

// --- Handlers ---
function handleConsoleLog(args) {
    const msg = args.messages.join(' ');

    // 1. Detect Order ID for downloading
    if (msg.includes('Order Created:')) {
        const parts = msg.split('Order Created:');
        if (parts.length > 1) {
            const idStr = parts[1].trim();
            // Assuming ID format might be gid://shopify/Order/12345 or just 12345
            currentOrderId = idStr.split('/').pop();
            console.log(`[Script] Detected Order ID: ${currentOrderId}`);
        }
    }

    // 2. Detect Snapshot
    if (msg.startsWith('[SNAPSHOT]')) {
        saveSnapshot(msg);
    }
}

function saveSnapshot(msg) {
    try {
        const jsonStart = msg.indexOf('{');
        if (jsonStart !== -1) {
            const metadata = msg.substring(0, jsonStart).trim();
            const jsonStr = msg.substring(jsonStart);

            // Sanitize filename
            let safeName = metadata
                .replace('[SNAPSHOT]', '')
                .replace(/[[\]]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');

            if (!safeName) safeName = `snapshot_${Date.now()}`;

            // Append scenario name to filename
            const filename = `${safeName}_${scenarioName}.json`;
            const filePath = path.join(snapshotsDir, filename);

            const snapshotData = JSON.parse(jsonStr);
            fs.writeFileSync(filePath, JSON.stringify(snapshotData, null, 2));
            console.log(`[Snapshot] Saved: ${filePath}`);
        }
    } catch (e) {
        console.error('[Snapshot] Failed to save:', e.message);
    }
}

function handleIteration(err) {
    if (currentOrderId && !err) {
        console.log(`[Script] Iteration finished. Downloading order ${currentOrderId}...`);
        downloadOrderJson(currentOrderId);
        currentOrderId = null; // Reset for next iteration
    }
}

// --- Helper: Download Order ---
function downloadOrderJson(orderId) {
    if (!shopName || !accessToken) {
        console.warn('[Download] Missing shop credentials, skipping download.');
        return;
    }

    // Fallback if version not found
    const version = apiVersion || '2024-01';
    const url = `https://${shopName}.myshopify.com/admin/api/${version}/orders/${orderId}.json`;
    const dest = path.join(ordersDir, `${orderId}.json`);

    const opts = {
        headers: {
            'X-Shopify-Access-Token': accessToken
        }
    };

    https.get(url, opts, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`[Download] Saved to: ${dest}`);
            });
        } else {
            console.error(`[Download] Failed with status: ${res.statusCode}`);
        }
    }).on('error', (e) => {
        console.error('[Download] Network error:', e.message);
    });
}
