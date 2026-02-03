#!/bin/bash

# Check if scenario file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <scenario_file.json>"
    exit 1
fi

SCENARIO_FILE="$1"
SCENARIO_NAME=$(basename "$SCENARIO_FILE" .json)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="reports"
ORDERS_DIR="orders"
COLLECTION="OrderAndRefunds.postman_collection.json"
ENV_FILE="shopify_env.json"
TEMP_ENV_EXPORT="temp_env_export_${TIMESTAMP}.json"

# Create directories if they doesn't exist
mkdir -p "$REPORT_DIR"
mkdir -p "$ORDERS_DIR"

echo "Running scenario: $SCENARIO_NAME"
echo "Timestamp: $TIMESTAMP"

# Initial Log Name
INIT_LOG_TXT="$REPORT_DIR/log_${SCENARIO_NAME}_${TIMESTAMP}.txt"

# Run Newman
# - exports environment to capture variables (like orderId) set during run
newman run "$COLLECTION" \
  -e "$ENV_FILE" \
  -d "$SCENARIO_FILE" \
  --reporters cli \
  --delay-request 5000 \
  --export-environment "$TEMP_ENV_EXPORT" \
  | tee "$INIT_LOG_TXT"

echo "Run complete. Processing results..."

# Extract orderId and credentials from exported environment using Node.js
# We use node here because it's guaranteed to be available if newman is running
ORDER_ID=$(node -e "
try {
  const env = require('./$TEMP_ENV_EXPORT');
  const orderIdVal = env.values.find(v => v.key === 'orderId')?.value;
  // Handle GID if present (gid://shopify/Order/12345) -> 12345
  if (orderIdVal) {
      console.log(orderIdVal.split('/').pop());
  }
} catch (e) {
  // silent fail or print nothing
}
")

SHOP_NAME=$(node -e "try { console.log(require('./$TEMP_ENV_EXPORT').values.find(v => v.key === 'shopName').value) } catch(e) {}")
ACCESS_TOKEN=$(node -e "try { console.log(require('./$TEMP_ENV_EXPORT').values.find(v => v.key === 'accessToken').value) } catch(e) {}")
API_VERSION=$(node -e "try { const v = require('./$TEMP_ENV_EXPORT').values.find(v => v.key === 'apiVersion')?.value; console.log(v || '2024-01') } catch(e) { console.log('2024-01') }")

# Cleanup temp environment file
rm "$TEMP_ENV_EXPORT"

if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ] && [ "$ORDER_ID" != "undefined" ]; then
    echo "Detected Order ID: $ORDER_ID"

    # Rename logs/reports using Order ID
    NEW_LOG_TXT="$REPORT_DIR/${ORDER_ID}_${SCENARIO_NAME}.log"

    mv "$INIT_LOG_TXT" "$NEW_LOG_TXT"

    echo "Renamed logs to:"
    echo "  - $NEW_LOG_TXT"

    # Download Order JSON
    if [ -n "$SHOP_NAME" ] && [ -n "$ACCESS_TOKEN" ]; then
        echo "Downloading Order JSON for ID: $ORDER_ID..."
        ORDER_JSON_FILE="$ORDERS_DIR/${ORDER_ID}.json"
        
        # Admin API URL format: https://{shop}.myshopify.com/admin/api/{version}/orders/{id}.json
        URL="https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders/${ORDER_ID}.json"
        
        http_code=$(curl -s -o "$ORDER_JSON_FILE" -w "%{http_code}" -H "X-Shopify-Access-Token: $ACCESS_TOKEN" "$URL")
        
        if [ "$http_code" -eq 200 ]; then
            echo "Order JSON saved to: $ORDER_JSON_FILE"
        else
            echo "Failed to download Order JSON. HTTP Code: $http_code"
            # Optional: remove empty file if failed
            rm -f "$ORDER_JSON_FILE"
        fi
    else
        echo "Warning: Could not find shopName or accessToken to download Order JSON."
    fi

else
    echo "Warning: No orderId found in the environment output. Files not renamed."
fi
