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

### Phase 1: Requirement Analysis & Verification
1.  **Analyze the Request**: Identify key parameters (Action, Items, Fulfillment, Discounts).
2.  **Verify Configuration**:
    *   **Action**: Read `config/shop_config.json`.
    *   **Start**: Identify which `{{VARIANT_X}}` and `{{CUSTOMER_Y}}` tokens are actually mapped to IDs.
    *   **Rule**: NEVER use a token (e.g., `{{VARIANT_2}}`) if it is not present or is empty in `shop_config.json`. Default to `{{VARIANT_1}}` or `{{VARIANT_3}}` if necessary.

### Phase 2: Scenario Generation (The "On-the-Fly" Step)
If the user's request requires a custom setup:
1.  **Construct JSON**: Create a JSON object based on the **Scenario Data Schema** (below).
    *   **Crucial**: Use only the tokens verified in Phase 1.
    *   **CRITICAL RULE**: Do **NOT** include a `title` field in the `lineItems` objects unless explicitly requested by the user to override it. The automation system automatically fetches the correct product title from Shopify to ensure data integrity.
    *   Ensure `actionType` maps to the correct Postman flow (`REFUND`, `RETURN`, `FULL_CANCEL`).
2.  **Save File**: Write the JSON to `scenario_templates/scenarios/adhoc/[descriptive_name].json`.
    *   *Naming Convention*: `adhoc/create_[N]_fulfill_[M]_refund_[K].json`.

### Phase 3: Synchronization
**CRITICAL**: You must replace tokens with real IDs before execution.
1.  **Run Setup Script**:
    ```bash
    node scripts/update_scenarios.js
    ```
    *   *Check Output*: usage `update_scenarios.js` output to confirm your new scenario was generated in the `scenarios/` folder.

### Phase 4: Execution & Reporting
1.  **Select Collection**:
    *   **Order Creation Only**: `OrderCreation.postman_collection.json`.
    *   **Complex Flows (Refunds/Returns)**: `OrderAndRefunds.postman_collection.json`.
2.  **Run Command**:
    ```bash
    node run.js --collection OrderAndRefunds.postman_collection.json --scenario scenarios/adhoc/[Filename].json --iterations 1
    ```
3.  **Monitor & Recovery**:
    *   **Success**: Report Order ID and status.
    *   **Failure - API Schema**: If error is "Field 'x' doesn't exist on type 'y'" (e.g., `priceSet` on `ShippingLine`), **edit the Postman Collection** request body to fix the GraphQL query, then re-run.
    *   **Failure - Invalid ID**: If error is "Invalid global id", check if `config/shop_config.json` has a valid ID for the token used. If not, edit the scenario to use a valid token, re-run `update_scenarios.js`, and re-execute.

## Scenario Data Schema
Use this reference when building JSON files:

### Core Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `scenarioName` | String | Human readable ID. |
| `lineItems` | Array | `[{ "variantId": "{{VARIANT_1}}", "quantity": 2, "price": "{{PRICE_1}}" }]` (No `title` needed) |
| `tags` | Array | `["tag1", "ADHOC_TEST"]` |
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
