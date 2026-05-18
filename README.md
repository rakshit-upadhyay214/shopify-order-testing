# Shopify Order Testing & Automation

This project is a comprehensive automation toolkit designed to streamline the testing of Shopify order workflows, including complex scenarios like mixed carts, returns, refunds, and POS data replication. It leverages AI Agents, Postman Collections, and Node.js scripts to provide a robust testing environment.

---

## 🚀 Key Capabilities & Skills

This project is powered by three main "Skills" that automate specific domains of the testing process:

### 1. Shopify Order Testing (`shopify-order-testing`)
*   **Purpose**: The core intelligence for creating and executing live order scenarios.
*   **Capabilities**:
    *   **Natural Language Processing**: Interprets requests like "Create a mixed cart order with 3 items, 30% discount, and fulfill one item."
    *   **Complex Scenarios**: Handles logical requirements such as:
        *   **Mixed Carts**: Combining shipping and pickup items (using custom attributes like `_pickupstore`).
        *   **Taxes & Discounts**: applying line-item taxes and order-level discount codes (e.g., `HC_GIFT`).
        *   **Fulfillment**: Automatically creating fulfillments for specific line items.
        *   **Post-Order Actions**: Managing Refunds, Returns, and Cancellations.
*   **Execution**: Generates precise JSON scenario files in `scenarios/adhoc/` and executes them using the `OrderAndRefunds.postman_collection.json`.

### 2. Shopify Setup (`shopify-setup`)
*   **Purpose**: Bootstraps the local environment with real data from your live Shopify store.
*   **Capabilities**:
    *   Fetches active **Product Variants** and **Customers** directly from the Shopify Admin API.
    *   Populates `config/shop_config.json` with valid `gid://` references (e.g., `{{VARIANT_1}}`, `{{CUSTOMER_1}}`).
    *   Ensures test scenarios always run against valid, in-stock inventory.

### 3. Order Replication (`order-replication`)
*   **Purpose**: generative testing for high-volume or POS (Point of Sale) scenarios.
*   **Capabilities**:
    *   Allows taking a single "Golden" POS JSON file and replicating it $N$ times.
    *   **Unique ID Generation**: Randomizes `id`, `order_number`, and `name` to prevent duplication errors in downstream systems (like ERPs/OMS).
    *   **Direct Upload**: Automatically uploads generated files to an external system (like Moqui MDM).
    *   **Script**: `scripts/replicate_orders.js`.

---

## 🛠 Project Structure

```text
├── .agent/skills/           # Definitions for AI Agent skills (Order Testing, Setup, Replication)
├── config/
│   └── shop_config.json     # Local config mapping logical tokens (VARIANT_1) to real Shopify IDs
├── orders/                  # Directory for storing downloaded order details
├── pos_scenarios/           # Templates for POS order replication
├── scenarios/
│   └── adhoc/               # Generated specific test scenarios (e.g., create_mixed_cart.json)
├── scenario_templates/      # Reusable templates for standard flows
├── scripts/
│   └── replicate_orders.js  # Script for bulk order replication
├── shopify_env.json         # Postman Environment variables (API Version, Secrets)
├── OrderCreation.postman_collection.json    # Collection for basic order flows
├── OrderAndRefunds.postman_collection.json  # Collection for advanced flows (Returns/Refunds)
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites
*   Node.js & npm
*   Newman (`npm install -g newman`)
*   A Shopify Private App with Admin API access.

### 🚀 First-Time Setup & Automation Workflow (AI Agent Flow)

You can bootstrap this entire project and run tests seamlessly by simply prompting the AI Agent. Follow this exact sequence for first-time setup:

#### Step 1: Configure Store Credentials
Tell the AI Agent your Shopify store name and Admin API access token. The Agent will automatically update `config/shop_config.json` and sync it with `shopify_env.json`.
*   **Prompt to Agent:**
    > "Setup the shop_config for shop `your-shop-name` and access token: `shpat_your_token_here`"

#### Step 2: Fetch and Sync Shop Data
Ask the Agent to fetch the latest product variants and customers from your Shopify store. The Agent will run the setup Postman collection, parse the retrieved data, and automatically populate all required mappings (like `{{VARIANT_1}}`, `{{CUSTOMER_1}}`, etc.) inside `config/shop_config.json`.
*   **Prompt to Agent:**
    > "Fetch the latest product variants and customers from the store to update the local configuration."

#### Step 3: Create and Execute Test Orders
Once the store mappings are populated, you can ask the Agent to create any test orders. The Agent will select the correct Postman collection, build a concrete JSON scenario, execute it with Newman, and provide a direct Shopify admin order link.
*   **Prompts to Agent:**
    *   *Create simple order:*
        > "Create an order with 2 items."
    *   *Create mixed shipping/pickup order:*
        > "Create a mixed cart order with 3 items, one fulfilled, and a 30% discount code `WELCOME10`."

---

### 💻 Manual CLI Execution (Without AI Agent)

If you prefer to run things manually using the command line:

#### 1. Setup Configuration
Update `config/shop_config.json` manually with your store credentials:
```json
{
    "shopName": "your-shop-name",
    "accessToken": "shpat_xxxxxxxxxxxxxxxx",
    "mappings": { ... } // Populated by shopify-setup skill or fetched manually
}
```

#### 2. Run a Test (Newman CLI)
Execute created scenarios directly using Newman:

**Basic Order Creation:**
```bash
newman run OrderAndRefunds.postman_collection.json -e shopify_env.json -d scenarios/adhoc/create_2_items.json
```

**Complex Flow (Order + Fulfillment + Refund):**
```bash
newman run OrderAndRefunds.postman_collection.json -e shopify_env.json -d scenarios/adhoc/create_mixed_cart_3_items_tax_discount.json
```

### 3. Bulk Replication & Direct Upload
You can replicate a POS order and optionally upload it directly to an MDM system (like Moqui).

**Configuration:**
Open `scripts/replicate_orders.js` and update the constants at the top of the file:
```javascript
const MOQUI_URL = "https://your-instance.hotwax.io/rest/s1/admin/uploadDataManagerFile";
const MOQUI_TOKEN = "your_bearer_token"; // Optional if auth is required
```

**Generate & Upload Command:**
To generate 50 unique copies and upload them immediately:
```bash
node scripts/replicate_orders.js --input pos_scenarios/POS_Test_Order.json --count 50 --upload
```

---

## 🤖 Sample Prompts for AI Agent

You can interact with the AI Agent using natural language to perform various tasks. Here are some example prompts aligned with the available skills:

### 1. Setup & Configuration (`shopify-setup`)
*   **Configure Store Credentials:**
    > "Setup the shop_config for shop `krewe-sunglasses` and access token: `token1232324`"
*   **Refresh Data:**
    > "Fetch the latest product variants and customers from the store to update the local configuration."

### 2. Order Creation (`shopify-order-testing`)
*   **Complex Order:**
    > "Create a mixed cart order with 3 items, one fulfilled, and a 30% discount code `HC_GIFT`."
*   **Tax & Shipping:**
    > "Create an order with 2 items, and include state tax."

### 3. Order Replication (`order-replication`)
*   **Replication from Existing File:**
    > "Replicate the order from `replicated_orders/DM47740_ShopifyOrder.json`."
*   **Replication with Upload:**
    > "Replicate the POS order json `pos_scenarios/New_York_POS.json` 50 times and upload the results."
