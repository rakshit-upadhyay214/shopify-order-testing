# Shopify Order Testing Automation

This repository provides an automated system for testing Shopify order flows, returns, and refunds. It uses a template-based approach to generate consistent test data across different Shopify stores and manages execution via two distinct methodologies.

---

## 🧪 Testing Methodologies

There are two primary ways to create test data in this system:

### 1. Live Shopify Order Creation (Web Scenarios)
*   **Goal**: Create real orders, returns, and refunds on your Shopify store via the Admin API.
*   **Source**: Files in the `scenarios/` directory.
*   **Tool**: `run.js` (uses Postman Collections + Newman).
*   **Workflow**: Creates a live order -> Validates against store state -> Downloads the resulting JSON.

### 2. Direct Payload Replication (POS Scenarios)
*   **Goal**: Simulate bulk order data by replicating existing JSON payloads directly.
*   **Source**: Files in the `pos_scenarios/` directory.
*   **Tool**: `replicate_orders.js`.
*   **Workflow**: Takes a "perfect" POS JSON -> Generates $N$ unique copies with randomized IDs -> Uploads/Saves them for downstream system testing (like Moqui).

---

## 🚀 Quick Start for New Shops (e.g., `gorjana-sandbox`)

If you are setting this up for a new Shopify store, follow these steps:

### 1. Clone & Install
```bash
git clone <repository-url>
cd shopify-order-testing
npm install
```

### 2. Configure Shop Settings
Open `config/shop_config.json` and update it with your store's details:
*   **`shopName`**: Your Shopify store subdomain (e.g., `gorjana-sandbox`).
*   **`accessToken`**: Your Shopify Admin API access token.
*   **`mappings`**: Update the Variant IDs and Prices to match active products in your store.
    *   Find valid `variantId`s in Shopify Admin and paste them into `{{VARIANT_1}}`, `{{VARIANT_2}}`, etc.
    *   Update `{{CUSTOMER_1}}` with a valid Customer GID.

### 3. Generate Scenario Files
Run the update script to propagate your config changes into all scenario files. This reads the **Templates** and generates the actual test files.
```bash
node scripts/update_scenarios.js
```

### 4. Run your first test
```bash
# Method 1: Create a live order on Shopify
node run.js --collection "OrderCreation.postman_collection.json" --scenario "scenarios/order_creation/basic.json"
```

---

## 🛠 Automation Tools

### 1. Scenario Generator (`update_scenarios.js`)
We do not edit files in the `scenarios/` or `pos_scenarios/` directories directly. Instead:
*   **Source**: `scenario_templates/` contains JSON files with tokens like `{{VARIANT_1}}`.
*   **Process**: `node scripts/update_scenarios.js` replaces tokens with values from `shop_config.json`.
*   **Shuffle**: Use `--shuffle` to randomize which products are used in which scenarios.
    ```bash
    node scripts/update_scenarios.js --shuffle
    ```

### 2. Bulk Replicator (`replicate_orders.js`)
Primarily used for **POS scenarios** to create volume for performance or sync testing.
```bash
node replicate_orders.js --input pos_scenarios/POS_EXC_EQUAL_RS.json --count 50
```

---

## 📖 Usage Guide & Collections

### Live Execution (`run.js`)
**Arguments:**
*   `--collection` (or `-c`): The Postman collection name.
*   `--scenario` (or `-s`): The path to the scenario JSON (from the `scenarios/` folder).

**Available Collections:**
- `OrderCreation.postman_collection.json`: Standard web order flows.
- `DraftOrderCreation.postman_collection.json`: Draft order to Order completion.
- `OrderAndRefunds.postman_collection.json`: Complex refund and return processing.

---

## 📂 Project Structure

*   `config/`: Store-specific configuration (`shop_config.json`).
*   `scenario_templates/`: The **Source of Truth** for all test cases.
*   `scenarios/`: **(Generated)** Web order scenarios for live Shopify creation.
*   `pos_scenarios/`: **(Generated)** POS order payloads for direct replication.
*   `scripts/`: Automation scripts for generation and environment management.
*   `shopify_env.json`: Postman environment settings (Auto-updated).
*   `run.js`: The engine for live Shopify testing.
*   `replicate_orders.js`: The engine for bulk payload replication.
*   `orders/`: Downloaded JSON payloads of orders created during live tests.
