-- Apache Phoenix views mapped onto the HBase tables (values are stored as text, so cast them in queries).
-- Row keys: customer = C000123 ; orders / interaction = C000123_20110301101500_<invoice>  (customer = chars 1-7, timestamp = chars 9-22)
CREATE VIEW IF NOT EXISTS "crm_customer" (rk VARCHAR PRIMARY KEY,
  "profile"."country" VARCHAR, "profile"."first_order_date" VARCHAR,
  "ml"."segment" VARCHAR, "ml"."churn_prob" VARCHAR, "ml"."clv_pred" VARCHAR);
CREATE VIEW IF NOT EXISTS "crm_orders" (rk VARCHAR PRIMARY KEY, "info"."amount" VARCHAR, "info"."items" VARCHAR);
CREATE VIEW IF NOT EXISTS "crm_interaction" (rk VARCHAR PRIMARY KEY, "activity"."type" VARCHAR, "activity"."amount" VARCHAR, "activity"."campaign" VARCHAR);
CREATE VIEW IF NOT EXISTS "crm_campaign" (rk VARCHAR PRIMARY KEY, "detail"."name" VARCHAR, "detail"."channel" VARCHAR, "detail"."rule" VARCHAR);
