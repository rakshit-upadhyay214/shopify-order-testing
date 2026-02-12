---
name: order-replication
description: Provides functionality to replicate Shopify order payloads with unique IDs for POS and direct webhook testing.
---

# Order Replication Skill

## Role and Purpose
This skill allows you to replicate existing Shopify order JSON payloads (like those from POS systems) and generate fresh variations with unique `id`, `legacyResourceId`, `number`, and `name`. This is essential for testing systems that ingest Shopify webhooks (like Moqui/HotWax) without creating duplicate record errors.

## Capability Context
This skill handles:
1.  **ID Randomization**: Replaces Shopify GIDs and numeric IDs with new random values within a valid range.
2.  **Sequential Numbering**: Adjusts order numbers to avoid collisions.
3.  **Output Management**: Creates a timestamped output file in the `replicated_orders/` directory.
4.  **Optional Upload**: Can automatically upload generated payloads to a configured endpoint (e.g., Moqui).

## Workflow Instructions

### Step 1: Prepare Input
Ensure you have a source JSON file containing one or more Shopify order payloads. POS scenarios are typically stored in the `pos_scenarios/` directory.

### Step 2: Run Replication
Use the script via the terminal:

```bash
node scripts/replicate_orders.js --input <path_to_json> --count <number_of_replications>
```

**Arguments:**
- `--input` or `-i`: Path to the source JSON file (required).
- `--count` or `-n`: Number of times to replicate the input (default: 1).
- `--upload` or `-u`: Optional flag to upload the generated file to the pre-configured MOQUI_URL.

### Step 3: Verify Output
Check the console output for the generated filename. It will be saved under `replicated_orders/[original_name]_[timestamp].json`.

## Best Practices
- **Isolation**: Use this for high-volume testing where live Shopify order creation is too slow or costly.
- **POS Mapping**: When testing POS flows, use the files in `pos_scenarios/` as templates.
- **Upload Config**: If the upload fails, verify the `MOQUI_URL` and `MOQUI_TOKEN` constants inside `scripts/replicate_orders.js`.
