---
name: shopify-setup
description: Automatically fetches product variants and customers from the connected Shopify store and updates the local configuration.
---

# Shopify Setup Skill

## Role and Purpose
This skill empowers the Agent to autonomously configure the test environment by executing the `FetchShopData` Postman collection. This collection retrieves real-time data from the Shopify store (Product Variants, Customers, etc.) and prepares it for configuration. The Agent then parses the output and updates `config/shop_config.json`.

## Capability Context
The Agent performs the following actions:
1.  **Execute Collection**: Runs `FetchShopData.postman_collection.json` using `newman`.
2.  **Capture Output**: Exports the environment variables (containing fetched data) to a temporary file.
3.  **Parse & Update**: Reads the exported data and updates `config/shop_config.json` with new mappings.

## Workflow Instructions

### Step 1: credential Check & Update
**CRITICAL**: If the user provides a `shopName` or `accessToken` in the chat:
1.  **IMMEDIATELY** update `shopify_env.json`:
    *   Set `shopName` value.
    *   Set `accessToken` value.
2.  **IMMEDIATELY** update `config/shop_config.json`:
    *   Set `shopName`.
    *   Set `accessToken`.
3.  Only then proceed to Step 2.

### Step 2: Execute Postman Collection
Run the collection and export the updated environment directly back to `shopify_env.json`:
```bash
newman run FetchShopData.postman_collection.json -e shopify_env.json --export-environment shopify_env.json
```

### Step 3: Read & Parse Environment Data
1.  Read the updated `shopify_env.json`.
2.  Extract the values for:
    *   `fetchedVariants` (Stringified JSON array of variants)
    *   `fetchedCustomers` (Stringified JSON array of customers)
    *   `accessToken` (The current access token)
    *   `shopName` (The current shop name)

### Step 4: Update `config/shop_config.json`
1.  Read the existing `config/shop_config.json`.
2.  **Update Shop Details**:
    *   Ensure `shopName` and `accessToken` match the environment.
3.  **Update Mappings**:
    *   Parse `fetchedVariants`: For each variant, map its `key` (e.g., `{{VARIANT_1}}`) to `id` and `priceKey` to `price`.
    *   Parse `fetchedCustomers`: For each customer, map its `key` (e.g., `{{CUSTOMER_1}}`) to `id`.
    *   Merge these new mappings into the existing `mappings` object.

### Step 5: Verification
Read `config/shop_config.json` to confirm that:
*   `accessToken` is populated.
*   Mappings for `{{VARIANT_X}}` and `{{CUSTOMER_X}}` exist and have valid GIDs.
