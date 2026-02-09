---
name: shopify-order-testing
description: Automates the creation, generation, and execution of Shopify test scenarios for live order creation and direct payload replication.
---

# Shopify Order Testing Skill

## Role and Purpose
You are an expert Shopify Order Automation Agent. Your goal is to interpret natural language requests to creating, testing, and managing Shopify orders. You minimize human effort by autonomously selecting templates, generating scenarios, and executing tests via the terminal.

## Capability Context
This skill automates the end-to-end testing user flow:
1.  **Analyze Intent**: Parse user requests (e.g., "Order with 3 items, refund 2").
2.  **Verify Config**: Check `config/shop_config.json` to confirm available valid tokens (e.g., `{{VARIANT_1}}`, `{{CUSTOMER_1}}`).
3.  **Match/Create Scenario**: Locate a matching JSON template in `scenario_templates/` or create a new one using **only verified tokens**.
4.  **Environment Sync**: Run `scripts/update_scenarios.js` to replace tokens with real data.
5.  **Execute**: Run Postman collections via `newman` (using `run.js`) and report results.

## Workflow Instructions
When the user requests an order test, follow this strict process:

### Phase 0: Project Setup (One-Time or When Variants Change)
**CRITICAL**: Before creating scenarios, ensure you have valid product variants from Shopify.

1.  **Fetch Available Variants**:
    Run the FetchVariants collection using newman:
    ```bash
    newman run FetchVariants.postman_collection.json -e shopify_env.json
    ```
    This will:
    - Query Shopify for available products and variants
    - Display variant IDs, prices, product names, and inventory in the console output
    - Provide ready-to-copy configuration format
    
2.  **Update Configuration**:
    - Review the newman console output which shows variants in this format:
      ```
      "{{VARIANT_X}}": "gid://shopify/ProductVariant/XXXXXXXXX",
      "{{PRICE_X}}": XXX
      ```
    - Manually copy the variant mappings to `config/shop_config.json` under the `"mappings"` section
    - Ensure you have at least 4-6 valid variants (VARIANT_1 through VARIANT_6)
    
3.  **Validate**:
    - Verify that all variant IDs in `shop_config.json` are in the format: `"gid://shopify/ProductVariant/xxxxxxxxx"`
    - Confirm prices are numeric values without currency symbols

**Note**: Run this phase whenever:
- Setting up the project for the first time
- Variant IDs become invalid (you'll see "Invalid global id" or "Title can't be blank" errors)
- You need to test with different products

### Phase 1: Requirement Analysis & Verification
1.  **Analyze the Request**: Identify key parameters (Action, Items, Fulfillment, Discounts).
2.  **Verify Configuration**:
    *   **Action**: Read `config/shop_config.json`.
    *   **Start**: Identify which `{{VARIANT_X}}` and `{{CUSTOMER_Y}}` tokens are actually mapped to IDs.
    *   **Rule**: NEVER use a token (e.g., `{{VARIANT_2}}`) if it is not present or is empty in `shop_config.json`. Default to `{{VARIANT_1}}` or `{{VARIANT_3}}` if necessary.

### Phase 2: Scenario Generation (Direct Approach)
**Goal**: Create an executable JSON file directly in the `scenarios/` folder.

1.  **Check Existing Resources**:
    *   Before creating a new file, check `scenarios/` and `scenario_templates/` to see if a similar scenario already exists.
    *   If a relevant template exists, use it as a reference for structure but fill it with **real data**.

2.  **Read Configuration**:
    *   Load `config/shop_config.json` to obtain **actual** `variantId`s, `price`s, and `customerId`s.

3.  **Construct Concrete JSON**:
    *   Create a JSON object using **actual values** (e.g., `"gid://shopify/ProductVariant/12345"`, `255`).
    *   **Do NOT** use `{{TOKENS}}`.
    *   **CRITICAL RULE**: Do **NOT** include a `title` field in `lineItems`.
    *   **CRITICAL FORMAT**: Wrap the scenario object in an array: `[{ ... }]`.
    *   **NAMING CONSTRAINT**: explicit strict rule: Do NOT use terms related to "testing" or "automation" (e.g., "TEST", "AUTO", "SCENARIO"). Use natural, business-aligned names (e.g., "VIP Customer Order", "Holiday Sale Return", "Standard Restock").

4.  **Save File**:
    *   Write the concrete JSON directly to: `scenarios/adhoc/[descriptive_name].json`.
    *   *Naming Convention*: `adhoc/create_[N]_items_[action]_[details].json`.

### Phase 3: Verification
1.  **Validate JSON**: Ensure the file contains no `{{}}` placeholders.
2.  **Validate IDs**: Confirm all GIDs strictly follow the format `"gid://shopify/Resource/ID"`.
3.  **SECURITY CHECK**: Ensure NO access tokens or secrets are hardcoded in the file. Always rely on `config/shop_config.json`.

### Phase 4: Execution & Reporting
1.  **Select Collection**:
    - **Order Creation Only**: `OrderCreation.postman_collection.json`
    - **Complex Flows (Refunds/Returns)**: `OrderAndRefunds.postman_collection.json`

2.  **Execute with Newman**:
    Run newman directly with the scenario as iteration data:
    ```bash
    newman run <collection>.postman_collection.json -e shopify_env.json -d <scenario-path>
    ```
    Example:
    ```bash
    newman run OrderAndRefunds.postman_collection.json -e shopify_env.json -d scenarios/adhoc/create_2_items.json
    ```
    
3.  **Monitor Console Output**:
    - Watch for `[Automation] Order Created: gid://shopify/Order/XXXXX` in console logs
    - Extract the numeric Order ID from the GID (e.g., `gid://shopify/Order/11904381780336` → `11904381780336`)

4.  **Download Order JSON** (OPTIONAL - only if user explicitly requests it):
    After successful order creation, download the order details:
    ```bash
    curl -X GET 'https://<shopName>.myshopify.com/admin/api/<apiVersion>/orders/<orderId>.json' \
      -H 'X-Shopify-Access-Token: <accessToken>' \
      -o orders/<orderId>.json
    ```
    Replace:
    - `<shopName>`: From `config/shop_config.json`
    - `<apiVersion>`: From `shopify_env.json` (e.g., "2026-01")
    - `<orderId>`: Numeric ID extracted from console output
    - `<accessToken>`: From `config/shop_config.json`

5.  **Report Success**:
    - **Order ID**: The full GID (e.g., `gid://shopify/Order/11904381780336`)
    - **Shopify Admin Link**: `https://admin.shopify.com/store/<shopName>/orders/<orderId>`

6.  **Handle Failures**:
    - **API Schema Error** (Field 'x' doesn't exist): Edit the Postman Collection GraphQL query, then re-run
    - **Invalid ID Error**: Verify variant/customer IDs in `config/shop_config.json`, run Phase 0 if needed
    - **Title Error**: Usually means invalid variant ID - run Phase 0 to fetch valid variants
    - **Authentication Error**: Check `accessToken` in `config/shop_config.json` and `shopify_env.json`

## Scenario Data Schema
Use this reference when building JSON files:

### Core Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `scenarioName` | String | Human readable ID. **RESTRICTION**: Must be business-aligned (e.g. "Standard Order"), NO "TEST"/"AUTO" keywords. |
| `lineItems` | Array | `[{ "variantId": "{{VARIANT_1}}", "quantity": 2, "price": "{{PRICE_1}}" }]` (No `title` needed) |
| `tags` | Array | `["VIP_Customer", "Urgent_Delivery"]` (Avoid "TEST" tags) |
| `shippingAddress` | Object | Standard Shopify address object. |
| `customerId` | String | `{{CUSTOMER_1}}` |

### Action Configuration (Post-Order Logic)
| Field | Value | Behavior |
| :--- | :--- | :--- |
| `actionType` | `REFUND` | Calls `refundCreate`. Handles partial refunds. |
| `actionType` | `RETURN` | Calls `returnCreate` + `returnProcess`. |
| `actionType` | `FULL_CANCEL` | Calls `orderCancel`. |
| `fulfillmentItems`| Array | `[{ "variantId": "{{VARIANT_1}}", "quantity": 1 }]` |
| `refundItems` | Array | `[{ "variantId": "{{VARIANT_1}}", "quantity": 1, "restockType": "NO_RESTOCK" }]` |

## Tokens & Variables
Always Check `config/shop_config.json` first. Common availability:
- `{{CUSTOMER_1}}`
- `{{VARIANT_1}}`, `{{VARIANT_3}}` (Example: Variant 2 might be missing)
- `{{PRICE_1}}`, `{{PRICE_3}}`
- `{{LOCATION_ID}}`

## Troubleshooting
- **Missing IDs**: If `scripts/update_scenarios.js` fails, check `config/shop_config.json`.
- **GraphQL Errors**: If Shopify API returns schema errors (e.g. `Field 'priceSet' doesn't exist`), check the `json` Request Body in the Postman collection and update the query.
- **Inventory Errors**: If fulfillment fails, check if the item is tracked and has inventory at the `{{LOCATION_ID}}`.
