erDiagram
    ORGANIZATIONS {
        uuid id PK
        varchar name
        varchar slug UK
        varchar status
        timestamp created_at
    }

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        boolean is_active
        timestamp created_at
    }

    MEMBERSHIPS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar role
        timestamp created_at
    }

    CATEGORIES {
        uuid id PK
        uuid organization_id FK
        varchar name
    }

    UNITS {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar symbol
    }

    PRODUCTS {
        uuid id PK
        uuid organization_id FK
        uuid category_id FK
        uuid unit_id FK
        varchar sku
        varchar name
        decimal cost_price
        decimal selling_price
        decimal min_stock
        boolean is_active
        timestamp created_at
    }

    WAREHOUSES {
        uuid id PK
        uuid organization_id FK
        varchar name
        boolean is_active
    }

    STOCK_BALANCES {
        uuid id PK
        uuid organization_id FK
        uuid warehouse_id FK
        uuid product_id FK
        decimal quantity
        timestamp updated_at
    }

    STOCK_MOVEMENTS {
        uuid id PK
        uuid organization_id FK
        uuid warehouse_id FK
        uuid product_id FK
        uuid created_by FK
        varchar movement_type
        decimal quantity
        varchar reference_type
        uuid reference_id
        text notes
        timestamp created_at
    }

    SUPPLIERS {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar phone
        varchar email
    }

    CUSTOMERS {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar phone
        varchar email
    }

    PURCHASE_ORDERS {
        uuid id PK
        uuid organization_id FK
        uuid supplier_id FK
        uuid created_by FK
        varchar order_number
        varchar status
        decimal total_amount
        timestamp created_at
    }

    PURCHASE_ORDER_ITEMS {
        uuid id PK
        uuid purchase_order_id FK
        uuid product_id FK
        decimal quantity
        decimal received_quantity
        decimal unit_cost
        decimal subtotal
    }

    SALES_ORDERS {
        uuid id PK
        uuid organization_id FK
        uuid customer_id FK
        uuid created_by FK
        varchar order_number
        varchar status
        decimal total_amount
        timestamp created_at
    }

    SALES_ORDER_ITEMS {
        uuid id PK
        uuid sales_order_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_price
        decimal subtotal
    }

    PLANS {
        uuid id PK
        varchar name
        int max_products
        int max_users
        decimal monthly_price
        boolean is_active
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid organization_id FK
        uuid plan_id FK
        varchar status
        timestamp current_period_end
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        timestamp created_at
    }

    ORGANIZATIONS ||--o{ MEMBERSHIPS : has
    USERS ||--o{ MEMBERSHIPS : joins

    ORGANIZATIONS ||--o{ CATEGORIES : owns
    ORGANIZATIONS ||--o{ UNITS : defines
    ORGANIZATIONS ||--o{ PRODUCTS : owns
    CATEGORIES o|--o{ PRODUCTS : categorizes
    UNITS ||--o{ PRODUCTS : measures

    ORGANIZATIONS ||--o{ WAREHOUSES : owns
    WAREHOUSES ||--o{ STOCK_BALANCES : stores
    PRODUCTS ||--o{ STOCK_BALANCES : balances
    WAREHOUSES ||--o{ STOCK_MOVEMENTS : records
    PRODUCTS ||--o{ STOCK_MOVEMENTS : moves
    USERS ||--o{ STOCK_MOVEMENTS : creates

    ORGANIZATIONS ||--o{ SUPPLIERS : owns
    ORGANIZATIONS ||--o{ CUSTOMERS : owns

    ORGANIZATIONS ||--o{ PURCHASE_ORDERS : owns
    SUPPLIERS ||--o{ PURCHASE_ORDERS : supplies
    USERS ||--o{ PURCHASE_ORDERS : creates
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : contains
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : purchased

    ORGANIZATIONS ||--o{ SALES_ORDERS : owns
    CUSTOMERS o|--o{ SALES_ORDERS : orders
    USERS ||--o{ SALES_ORDERS : creates
    SALES_ORDERS ||--|{ SALES_ORDER_ITEMS : contains
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : sold

    ORGANIZATIONS ||--o{ SUBSCRIPTIONS : subscribes
    PLANS ||--o{ SUBSCRIPTIONS : selected

    ORGANIZATIONS ||--o{ AUDIT_LOGS : records
    USERS ||--o{ AUDIT_LOGS : performs
