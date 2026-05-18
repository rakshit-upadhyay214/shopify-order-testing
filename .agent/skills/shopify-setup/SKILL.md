---
name: shopify-setup
description: Automatically fetches product variants and customers from the connected Shopify store and updates the local configuration.
---

# Shopify Setup Skill

## Role and Purpose
This skill empowers the Agent to autonomously configure the test environment by executing the `FetchShopData` Postman collection. This collection retrieves real-time data from the Shopify store (Product Variants, Customers, etc.) and prepares it for configuration. The Agent then parses the output and updates `config/shop_config.json`.

## Capability Context
The Agent performs the following actions:
1.  **Execute Collection**: Runs `collections/FetchShopData.postman_collection.json` using `newman`.
2.  **Capture Output**: Exports the environment variables (containing fetched data) to a temporary file.
3.  **Parse & Update**: Reads the exported data and updates `config/shop_config.json` with new mappings.

## Workflow Instructions

### Step 1: Credential Check & Update
**CRITICAL**: If the user provides a `shopName` or `accessToken` in the chat, the Agent **MUST** update both configuration files:
1.  **Update `config/shop_config.json`**:
    *   Set `shopName`.
    *   Set `accessToken`.
2.  **Update `shopify_env.json`**:
    *   Parse the file as JSON.
    *   Find the objects inside the `values` array where `key === "shopName"` and `key === "accessToken"`.
    *   Update their `value` fields respectively.
    *   Write the JSON back to `shopify_env.json` (preserving the formatting, do NOT use Newman to export or overwrite it).
3.  Only then proceed to Step 2.

### Step 2: Execute Postman Collection
Run the collection and export the updated environment directly back to `shopify_env.json`:
```bash
newman run collections/FetchShopData.postman_collection.json -e shopify_env.json --export-environment shopify_env.json
```

### Step 3: Read, Parse & Clean Environment Data
1.  Read the updated `shopify_env.json`.
2.  Extract the values for:
    *   `fetchedVariants` (Stringified JSON array of variants)
    *   `fetchedCustomers` (Stringified JSON array of customers)
3.  **Clean up `shopify_env.json` immediately** to prevent environment corruption and formatting changes:
    *   Filter the `values` array to keep **ONLY** the standard core variables: `shopName`, `accessToken`, and `apiVersion`.
    *   Remove all other transient/temporary variables (such as `fetchedVariants`, `fetchedCustomers`, `orderId`, `fulfillmentOrderId`, etc.) from the `values` array.
    *   Save the clean, standard-formatted JSON back to `shopify_env.json` (e.g. using `JSON.stringify(env, null, 2)`).

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
