-- Datasets for Apache Superset (database URI: phoenix://<host>:8765/ via the Phoenix SQLAlchemy driver).
-- 1) Customers per segment
SELECT "segment", COUNT(*) AS customers FROM "crm_customer" WHERE "segment" IS NOT NULL GROUP BY "segment";
-- 2) Average predicted spend (next 6 months) per segment
SELECT "segment", AVG(CAST("clv_pred" AS DOUBLE)) AS avg_clv FROM "crm_customer" WHERE "segment" IS NOT NULL GROUP BY "segment";
-- 3) Top 10 churn-risk customers
SELECT rk AS customer_id, "country", "segment", CAST("churn_prob" AS DOUBLE) AS churn_prob
FROM "crm_customer" WHERE "churn_prob" IS NOT NULL ORDER BY CAST("churn_prob" AS DOUBLE) DESC LIMIT 10;
-- 4) Revenue per month
SELECT SUBSTR(rk, 9, 6) AS month, SUM(CAST("amount" AS DOUBLE)) AS revenue FROM "crm_orders" GROUP BY SUBSTR(rk, 9, 6) ORDER BY month;
-- 5) Customers by country
SELECT "country", COUNT(*) AS customers FROM "crm_customer" GROUP BY "country" ORDER BY customers DESC LIMIT 15;
