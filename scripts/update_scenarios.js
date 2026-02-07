const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/shop_config.json');
const TEMPLATES_DIR = path.join(__dirname, '../scenario_templates');
const OUTPUT_ROOT = path.join(__dirname, '..');
const SHOPIFY_ENV_PATH = path.join(OUTPUT_ROOT, 'shopify_env.json');
const EXCLUDED_DIRS = ['pos_scenarios'];

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        throw new Error(`Config file not found at ${CONFIG_PATH}`);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function replaceTokens(content, mappings) {
    let updatedContent = content;
    const sortedTokens = Object.keys(mappings).sort((a, b) => b.length - a.length);

    for (const token of sortedTokens) {
        const value = mappings[token];

        if (typeof value === 'number') {
            const quotedToken = `"${token}"`;
            if (updatedContent.includes(quotedToken)) {
                updatedContent = updatedContent.split(quotedToken).join(value);
            } else {
                updatedContent = updatedContent.split(token).join(value);
            }
        } else {
            updatedContent = updatedContent.split(token).join(value);
        }
    }
    return updatedContent;
}

function processDirectory(srcDir, destDir, mappings) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const items = fs.readdirSync(srcDir);
    for (const item of items) {
        const srcPath = path.join(srcDir, item);
        const destPath = path.join(destDir, item);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            processDirectory(srcPath, destPath, mappings);
        } else if (item.endsWith('.json')) {
            const template = fs.readFileSync(srcPath, 'utf8');
            const generated = replaceTokens(template, mappings);
            fs.writeFileSync(destPath, generated);
            console.log(`Generated: ${path.relative(OUTPUT_ROOT, destPath)}`);
        }
    }
}

function updateShopifyEnv(shopName, accessToken) {
    if (!fs.existsSync(SHOPIFY_ENV_PATH)) return;

    try {
        const envData = JSON.parse(fs.readFileSync(SHOPIFY_ENV_PATH, 'utf8'));
        let changed = false;

        const updateKey = (key, val) => {
            const variable = envData.values.find(v => v.key === key);
            if (variable) {
                if (variable.value !== val) {
                    variable.value = val;
                    changed = true;
                }
            } else {
                envData.values.push({ key, value: val, enabled: true });
                changed = true;
            }
        };

        updateKey('shopName', shopName);
        updateKey('accessToken', accessToken);

        if (changed) {
            fs.writeFileSync(SHOPIFY_ENV_PATH, JSON.stringify(envData, null, 4));
            console.log(`Updated shopify_env.json with ${shopName}`);
        }
    } catch (err) {
        console.error('Failed to update shopify_env.json:', err.message);
    }
}

function shuffleMappings(mappings) {
    const variantKeys = Object.keys(mappings).filter(k => k.startsWith('{{VARIANT_')).sort();
    const pairs = [];
    const others = {};

    variantKeys.forEach(vKey => {
        const num = vKey.match(/\d+/)[0];
        const pKey = `{{PRICE_${num}}}`;
        if (mappings[pKey] !== undefined) {
            pairs.push({ v: mappings[vKey], p: mappings[pKey] });
        } else {
            others[vKey] = mappings[vKey];
        }
    });

    Object.entries(mappings).forEach(([k, v]) => {
        if (!k.startsWith('{{VARIANT_') && !k.startsWith('{{PRICE_')) {
            others[k] = v;
        }
    });

    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    const shuffled = { ...others };
    variantKeys.forEach((vKey, i) => {
        if (i < pairs.length) {
            const num = vKey.match(/\d+/)[0];
            const pKey = `{{PRICE_${num}}}`;
            shuffled[vKey] = pairs[i].v;
            shuffled[pKey] = pairs[i].p;
        }
    });

    return shuffled;
}

function run() {
    try {
        console.log('--- Scenario Update Source: scenario_templates ---');
        const config = loadConfig();
        let mappings = config.mappings;

        if (process.argv.includes('--shuffle')) {
            console.log('Shuffling variant mappings...');
            mappings = shuffleMappings(mappings);
            config.mappings = mappings;
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
        }

        const subdirs = fs.readdirSync(TEMPLATES_DIR);
        for (const dir of subdirs) {
            if (EXCLUDED_DIRS.includes(dir)) {
                console.log(`Skipping excluded directory: ${dir}`);
                continue;
            }

            const srcPath = path.join(TEMPLATES_DIR, dir);
            if (fs.statSync(srcPath).isDirectory()) {
                const destPath = path.join(OUTPUT_ROOT, dir);
                processDirectory(srcPath, destPath, mappings);
            }
        }

        updateShopifyEnv(config.shopName, config.accessToken);
        console.log('Done.');
    } catch (err) {
        console.error('Update failed:', err.message);
        process.exit(1);
    }
}

run();
