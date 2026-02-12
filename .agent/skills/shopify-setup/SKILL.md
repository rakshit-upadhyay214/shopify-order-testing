---
name: shopify-setup
description: Automatically fetches product variants and customers from the connected Shopify store and updates the local configuration.
---

# Shopify Setup Skill

## Role and Purpose
This skill empowers the Agent to autonomously configure the test environment by fetching real-time data from the Shopify store **without external scripts**. The Agent directly queries the Shopify Admin API to retrieve valid Product Variants and Customers, then updates the local configuration.

## Capability Context
The Agent performs the following actions directly:
1.  **Read Credentials**: parsed from `shopify_env.json`.
2.  **Fetch Data**: Uses `curl` to query the Shopify Admin API for Products and Customers.
3.  **Update Config**: Formats the response and writes it to `config/shop_config.json`.

## Workflow Instructions

### Step 1: Read Environment Variables
1.  Read `shopify_env.json` to extract:
    *   `shopName` (e.g., `gorjana-sandbox`)
    *   `accessToken` (e.g., `shpat_...`)
    *   `apiVersion` (default to `2024-01` if missing)

### Step 2: Fetch Products & Variants
Execute the following `curl` command (replacing placeholders) to fetch products and their variants:
```bash
curl -X GET "https://<shopName>.myshopify.com/admin/api/<apiVersion>/products.json?limit=5&fields=id,title,variants" \
  -H "X-Shopify-Access-Token: <accessToken>" \
  -H "Content-Type: application/json"
```
**Action**:
*   Parse the JSON response.
*   Extract the `id` and `price` from the first 3-5 variants found across the products.
*   Store these mapping candidates (e.g., `Variant 1` -> `43729076`, `Price 1` -> `19.99`).

### Step 3: Fetch Customers
Execute the following `curl` command:
```bash
curl -X GET "https://<shopName>.myshopify.com/admin/api/<apiVersion>/customers.json?limit=5&fields=id,first_name,email" \
  -H "X-Shopify-Access-Token: <accessToken>" \
  -H "Content-Type: application/json"
```
**Action**:
*   Extract the `id` from the first 3-5 customers.
*   Store these mapping candidates (e.g., `Customer 1` -> `7890123`).

### Step 4: Write Configuration
Construct a JSON object with the extracted data and write it to `config/shop_config.json`.
**Target Format**:
```json
{
  "{{VARIANT_1}}": "gid://shopify/ProductVariant/<ID_1>",
  "{{PRICE_1}}": "<PRICE_1>",
  "{{VARIANT_2}}": "gid://shopify/ProductVariant/<ID_2>",
  "{{PRICE_2}}": "<PRICE_2>",
  "{{CUSTOMER_1}}": "gid://shopify/Customer/<CUST_ID_1>",
  "{{CUSTOMER_2}}": "gid://shopify/Customer/<CUST_ID_2>",
  "{{LOCATION_ID}}": "gid://shopify/Location/<LOC_ID>"
}
```
*Note*: If `LOCATION_ID` is not readily available, default to a known location or fetch via `/admin/api/<ver>/locations.json`.

### Step 5: Verification
*   Read `config/shop_config.json` to confirm the file has been created/updated with valid GIDs.

