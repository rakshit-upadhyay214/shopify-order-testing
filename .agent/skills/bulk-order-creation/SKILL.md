---
name: bulk-order-creation
description: Specialized skill for generating multiple Shopify orders from a bulk scenario file and producing a unified CSV report using expert GraphQL logic.
---

# Bulk Order Creation Skill

## Role and Purpose
You are specialized in high-volume Shopify order generation for testing. You use the **Shopify GraphQL Admin API** (`orderCreate` mutation) to construct high-fidelity order payloads dynamically, ensuring all orders are created with correct financial statuses (Paid), shipping details, and metadata for enterprise-level reporting.

## Workflow Instructions

### Phase 1: Requirement Analysis & Scenario Definition
1.  **Analyze Intent**: Extract Source Category, Scenario ID, Scenario Name, Description, and Associated Validation Services from the user request.
2.  **Construct Bulk JSON**: Create a JSON array of order scenarios. Each object must follow this expert schema:
    ```json
    {
        "sourceCategory": "Order Data Scenarios",
        "scenarioId": "SCN_UNIQUE_ID",
        "scenarioName": "Descriptive Name",
        "description": "Specific test case description",
        "associatedValidationServices": "VAL_1 | VAL_2",
        "orderName": "#UNIQUE-IDENTIFIER-1",
        "customerId": "gid://shopify/Customer/XXXXX",
        "lineItems": [
            {
                "variantId": "gid://shopify/ProductVariant/XXXXX",
                "quantity": 1,
                "price": 85.00,
                "requiresShipping": true
            }
        ],
        "shippingLines": [{"title": "Standard", "price": 8.0, "code": "Standard"}],
        "tags": ["SCN_UNIQUE_ID"],
        "taxesIncluded": false,
        "note": "Optional reference note"
    }
    ```
3.  **BOPIS / Store Pickup Rule**: If the scenario involves pickup, add these properties to the line item:
    ```json
    "properties": [
        { "name": "Delivery Method", "value": "Pick Up at Brooklyn, 138 N 6th Street" },
        { "name": "_pickupstore", "value": "49" }
    ]
    ```

### Phase 2: Dynamic Payload Construction & Execution
The Postman collection (`OrderCreation.postman_collection.json`) uses expert logic to process this JSON:
1.  **Auto-Calculation**: It sums (`item.price * item.quantity`) + `shippingLines.price` - `discounts` to create a matching **Transaction**.
2.  **Transaction Injection**: It automatically injects a `SALE` transaction with status `SUCCESS` using the calculated total. This ensures the order is created as **Paid**.
3.  **GraphQL Execution**: Use `newman` to execute the bulk file:
    ```bash
    npx newman run OrderCreation.postman_collection.json -e shopify_env.json -d <bulk_file>.json > execution_bulk.log 2>&1
    ```

### Phase 3: CSV Reporting Logic
1.  **Logging**: The collection logs data in this format: `[CSV_DATA_V3] Category | ID | Name | Desc | Services | GID | Name`.
2.  **Generation**: Run a Python script to parse `execution_bulk.log` and generate `order_creation_results.csv`.
3.  **Required Header**: `Source Category, Scenario ID, Scenario Name, Description, Associated Validation Services, Shopify Order ID, Shopify Order Name, Shopify Order Link`

## Rules and Constraints
*   **Name Uniqueness**: Shopify requires unique order names. Always use a sequence or timestamp (e.g., `#GORTEST23367-S1`).
*   **Shipping Logic**: 
    *   Set `requiresShipping: true` for line items.
    *   Ensure a `shippingLines` entry exists if `requiresShipping` is true.
*   **Financial Integrity**: The transaction amount **MUST** exactly match the order total (Subtotal + Shipping + Taxes - Discounts) or the mutation may fail or create an "Overdue" status.
*   **Admin Links**: Construct links using the numeric ID parsed from the GID: `https://admin.shopify.com/store/<store>/orders/<numeric_id>`.
