---
name: ShopifyOrderTesting
description: Automates the creation, generation, and execution of Shopify test scenarios for live order creation and direct payload replication.
---

# Shopify Order Testing Skill

This skill allows you to handle user requests for testing Shopify order scenarios by finding existing templates, creating new ones, generating final scenario files, and executing them with full automation.

## Core Capabilities
1.  **Requirement Analysis**: Interpret user requests for specific order configurations (discounts, taxes, returns, etc.).
2.  **Scenario Discovery & Reuse**: Search `scenario_templates/` first. Do not create new scenarios unless existing ones fail to satisfy requirements.
3.  **On-the-fly Template Creation**: Create robust JSON templates in the correct subdirectory using shop-agnostic tokens.
4.  **Configuration & Environment Management**: Handle shop setup (`shop_config.json`) and environment synchronization (`shopify_env.json`).
5.  **Automated Execution**: Run Newman-based live tests via `run.js`.

## Tokens & Variables
Always use these placeholders in `scenario_templates/` from `config/shop_config.json`:
- `{{CUSTOMER_1}}`: Primary customer GID.
- `{{VARIANT_1}}` to `{{VARIANT_8}}`: Product variant GIDs.
- `{{PRICE_1}}` to `{{PRICE_8}}`: Corresponding variant prices.

## Scenario Data Schema (JSON Fields)

### Core Fields (Order Creation)
- `scenarioName`: (String) Human readable name.
- `tags`: (Array) Searchable identifiers.
- `lineItems`: (Array) Each item with `variantId`, `quantity`, and `price`.
- `taxesIncluded`: (Boolean) Whether taxes are included in the unit price.
- `shippingLines`: (Array) Shipping options with `title`, `price`, `code`.
- `discountCode`: (Object) `{ "code": "...", "type": "percentage|fixed_amount|free_shipping", "amount": 10 }`.
- `customerId`: (String) Use `{{CUSTOMER_1}}`.
- `shippingAddress`: (Object) Standard Shopify address structure.

### Action Fields (Fulfillment & Refunds)
- `fulfillmentItems`: (Array) Items to fulfill immediately after order creation. `{ "variantId": "...", "quantity": 1 }`.
- `actionType`: (String) Controls post-order logic in Postman.
    - `REFUND`: **Map to `refundCreate` API**. Most versatile. Handles partial refunds, unfulfilled line-item cancellations, shipping refunds, and mixed scenarios.
    - `RETURN`: **Map to `returnCreate` + `returnProcess` APIs**. Used for the "Managed Returns" flow. Best for pure return scenarios where a Return entity is desired.
    - `FULL_CANCEL`: **Map to `orderCancel` API**. Cancels the entire order.
- `refundItems`: (Array) Items to be returned/cancelled.
    - `restockType`: `RETURN` (for fulfilled items), `CANCEL` (for unfulfilled items), `NO_RESTOCK`.
    - `reason`: `NOT_AS_DESCRIBED`, `CUSTOMER_REQUESTED`, `UNWANTED`, etc.
- `shippingRefund`: (Object) `{ "amount": 15, "fullRefund": true }`. Used in `REFUND` action to reimburse shipping.
- `netCancelParams`: (Object) Configuration for `FULL_CANCEL`. Includes `restock`, `reason`, `staffNote`, and `refundMethod`.

## Workflow

### 1. Step 1: Search & Evaluate (Proactive Reuse)
Before creating a new scenario, search existing templates to avoid duplicates.
```bash
grep -r "keyword" scenario_templates/
```
Check if any template satisfies the user's specific mix of fulfillment, returns, and discounts.

### 2. Step 2: Create/Modify Template
If no match is found, create a new template in `scenario_templates/scenarios/refunds_returns/` (for flow tests) or `scenario_templates/scenarios/order_creation/` (for basic tests).
**Guideline**: Always explain your thought process. Log *why* you are choosing specific `actionType` values or *how* the `refundItems` should match the `fulfillmentItems`.

### 3. Step 3: Synchronize (GID Injection)
After creating a template, you **MUST** sync it with actual store GIDs.
```bash
node scripts/update_scenarios.js
```
This script reads `config/shop_config.json` and generates the final JSON files in the root `scenarios/` directory.

### 4. Step 4: Execute
Run the scenario using `run.js`.
- For Basic Orders: Use `OrderCreation.postman_collection.json`.
- For Refunds/Returns flows: Use `OrderAndRefunds.postman_collection.json`.
**Command**:
```bash
node run.js --collection [COLLECTION_FILE] --scenario scenarios/[PATH_TO_GENERATED_JSON] --iterations [N]
```

## Maintenance & Logging
1.  **Thought Process**: Always state your reasoning for scenario design (e.g., "Designing a mixed scenario because the user wants both a return and a cancellation in one go").
2.  **Failure Analysis**: If a run fails, check `snapshots/` and `orders/` directories for debugging JSON payloads.
3.  **Shuffle Proactively**: If a user asks to "test with different products", run `node scripts/update_scenarios.js --shuffle`.

## Success Metrics
- Existing scenarios are utilized whenever possible.
- User is prompted for iteration count when appropriate.
- Tokens are correctly replaced, and tests execute without environment errors.
