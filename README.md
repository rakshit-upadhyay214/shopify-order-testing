# Shopify Order Testing Automation

This repository provides an automated way to test Shopify Order creation and management flows using Postman Collections and Newman. It allows you to simulate complex order scenarios (Draft Orders, standard Orders, Refunds) with varied setups for discounts, shipping, and taxes, and then validates the results against your Shopify store.

## Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **Newman**: The command-line collection runner for Postman.
  ```bash
  npm install
  ```
  (Or install globally: `npm install -g newman`)

## Setup

### 1. Configure Environment (`shopify_env.json`)
You must update the `shopify_env.json` file with your target Shopify store's credentials.
**Note:** Do not commit this file with real credentials if pushing to a public repository.

Open `shopify_env.json` and set the following values:
- **`shopName`**: The subdomain of your Shopify store (e.g., `krewe-sunglasses` for `krewe-sunglasses.myshopify.com`).
- **`accessToken`**: Your Admin API access token (starts with `shpat_...`).
- **`apiVersion`**: The Admin API version to use (e.g., `2024-01`).

### 2. Configure Scenarios
Scenario files can be found in the `scenarios/` directory (e.g., `scenarios/refunds_returns/partially_fulfilled.json`). These JSON files define the data used for each test run.

**CRITICAL: Update Variant IDs**
The scenario files contain `variantId` fields (e.g., `gid://shopify/ProductVariant/123456789`).
- You **MUST** update these IDs to match valid, actively available product variants in your specific Shopify store.
- If the variant IDs do not exist in your store, the order creation will fail.

**Update Customer Information**
The scenario files rely on customer data to associate orders with users.
- Ensure the `email` or `customerId` fields in the scenario files correspond to valid customers in your store or are unique if creating new ones.

## Usage

Use the `run.js` script to execute a Postman collection with a specific scenario file.

### Command Syntax
```bash
node run.js --collection "<Collection Filename>" --scenario "<Path to Scenario JSON>"
```

### Examples

**1. Create a Draft Order**
This uses the *DraftOrderCreation* collection to create a draft order, verify it, and complete it to create a real order.
```bash
node run.js --collection "DraftOrderCreation.postman_collection.json" --scenario "scenarios/draft_order_creation/mixed_discounts.json"
```

**2. Standard Order Creation & Refunds**
Use this to test standard order creation flows or sync processes, including refunds.
```bash
node run.js --collection "OrderAndRefunds.postman_collection.json" --scenario "scenarios/refunds_returns/return_restock_admin.json"
```

### Arguments
- `--collection` (or `-c`): The path to the Postman collection file (e.g., `DraftOrderCreation.postman_collection.json`).
- `--scenario` (or `-s`): The path to the scenario JSON file.
- `--iterations` (or `-n`): (Optional) Number of times to run the full set of scenarios. Defaults to 1.

### 3. Run Multiple Iterations
Run the scenarios 3 times in a row 
```bash
node run.js --collection "OrderAndRefunds.postman_collection.json" --scenario "scenarios/order_creation/basic.json" --iterations 3
```

## Output

After a successful run:
1. **Orders**: The resulting Order JSON is automatically downloaded from Shopify and saved to the `orders/` directory (filename format: `<OrderID>.json`).
2. **Snapshots**: GraphQL snapshots or other intermediate data are saved to the `snapshots/` directory.
