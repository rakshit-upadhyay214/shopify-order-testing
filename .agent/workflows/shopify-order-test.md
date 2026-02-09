---
description: Complete Shopify order testing workflow from setup to execution
---

# Shopify Order Testing Workflow

This workflow guides you through creating and executing Shopify test orders without Node.js scripts.

## Phase 0: Initial Setup (Run Once or When Variants Change)

// turbo
1. Fetch available product variants from Shopify:
   ```
   newman run FetchVariants.postman_collection.json -e shopify_env.json
   ```

2. Review the console output showing available variants and copy the variant mappings

3. Update `config/shop_config.json` with the variant mappings from the newman output

## Phase 1: Configuration Check

4. Read `config/shop_config.json` to verify:
   - `shopName` is set correctly
   - `accessToken` is valid
   - Required variant tokens are mapped ({{VARIANT_1}}, {{VARIANT_2}}, etc.)
   - Customer token {{CUSTOMER_1}} is mapped

## Phase 2: Scenario Selection

5. Check if a scenario exists for the user's request:
   - Search in `scenario_templates/` or `scenarios/` subdirectories
   - If found: note the path
   - If NOT found: Create a new scenario JSON file in `scenario_templates/scenarios/refunds_returns/` or `adhoc/` following the schema from SKILL.md
   - **IMPORTANT**: Wrap scenario in array format: `[{...}]`

## Phase 3: Smart Template Processing

6. Check if the scenario file contains `{{}}` tokens:
   - **If YES**: It's a template → proceed to step 7
   - **If NO**: It's concrete → skip to Phase 4 (use as-is)

7. For templates only: Replace tokens with real IDs
   - Read `config/shop_config.json` to get the `mappings` object
   - Replace all {{VARIANT_X}}, {{PRICE_X}}, {{CUSTOMER_1}} tokens
   - For prices, write as numbers not strings
   - Save to `scenarios/` directory with same path
   - Example: `scenario_templates/refunds_returns/WEB_FUL_RFD_NRS.json` → `scenarios/refunds_returns/WEB_FUL_RFD_NRS.json`

8. Verify the final scenario file has no {{}} tokens

## Phase 4: Execution

9. Select the appropriate Postman collection:
   - Simple orders: `OrderCreation.postman_collection.json`
   - Orders with refunds/returns: `OrderAndRefunds.postman_collection.json`

// turbo
10. Execute with newman:
    ```
    newman run <collection>.postman_collection.json -e shopify_env.json -d <scenario-path>
    ```
    Example:
    ```
    newman run OrderAndRefunds.postman_collection.json -e shopify_env.json -d scenarios/refunds_returns/WEB_FUL_RFD_NRS.json
    ```

11. Monitor console output for `[Automation] Order Created: gid://shopify/Order/XXXXX`

12. Extract numeric order ID from the GID (e.g., `gid://shopify/Order/11904381780336` → `11904381780336`)

## Phase 5: Reporting

13. Report to the user:
    - **Order ID**: Full GID (e.g., `gid://shopify/Order/11904381780336`)
    - **Shopify Admin Link**: `https://admin.shopify.com/store/<shopName>/orders/<orderId>`

## Optional: Download Order JSON

**Only perform if user explicitly requests the order JSON file:**

// turbo
14. Download the order JSON:
    ```
    curl -X GET 'https://<shopName>.myshopify.com/admin/api/<apiVersion>/orders/<orderId>.json' -H 'X-Shopify-Access-Token: <accessToken>' -o orders/<orderId>.json
    ```
    Replace placeholders:
    - `<shopName>`: From `config/shop_config.json`
    - `<apiVersion>`: From `shopify_env.json` (e.g., "2026-01")
    - `<orderId>`: Numeric ID from step 12
    - `<accessToken>`: From `config/shop_config.json`

## Error Handling

If errors occur:
- **"Invalid global id"**: Run Phase 0 again to fetch valid variants
- **"Title can't be blank"**: Same as above - invalid variant ID
- **"Field doesn't exist"**: Edit the Postman Collection GraphQL query
- **Authentication errors**: Check `accessToken` in config files
