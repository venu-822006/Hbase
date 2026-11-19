# HBase-Based CRM Data Warehouse – MVP (real data, Java pipeline + Python ML)

Uses **your real customer / sales data** - nothing is generated. Java does everything except machine learning; **Python only for ML** (`ml/crm_ml.py`).

## Input data
Put your CRM / sales export at `data/raw/online_retail.csv` (columns and formats: see `data/raw/README.txt`).
It is streamed into Kafka as-is; the Spark ETL then removes rows without a customer ID, bad dates / numbers and exact duplicates.

## Pipeline
| Abstract step | Class / script | Language |
|---|---|---|
| HBase tables | `CreateTables` | Java |
| 1+2 Capture + ingest | `KafkaProducerApp` (real file -> topic `crm.sales`) | Java + Kafka |
| 3+4 Transform + load | `SparkEtlLoad` (+ `SalesTransform`, `HBaseLoader`) | Java + Spark -> HBase |
| 5 Query | `PhoenixViews`, `phoenix_views.sql` | Java + Phoenix |
| 6 Apply ML | `ml/crm_ml.py` | **Python**, Spark MLlib |
| 8 Feedback to CRM | `CrmFeedback` (offers from `config/campaigns.csv`) | Java |
| 7 Visualise | `DashboardApp`, `superset_queries.sql` | Java / Superset |

## HBase tables built from your data
| Table | Row key | Content |
|---|---|---|
| `crm_customer` | `C000123` | country, first order date, ML results (`ml:` family) |
| `crm_orders` | `C000123_20110301101500_<invoice>` | invoice amount, item count |
| `crm_interaction` | same style | cancellations / returns, later campaign offers |
| `crm_campaign` | `M001` | campaign catalogue (`config/campaigns.csv`, business rules) |

## ML on real outcomes (no synthetic labels)
Features come from orders before a cutoff (last 180 days of data held out). Labels are what customers actually did afterwards:
- **Churn** (Logistic Regression): no order after the cutoff.
- **Expected spend, next 180 days** (Linear Regression): money actually spent after the cutoff.
- **Segments** (K-Means, 4 groups on recency / frequency / monetary etc. as of today).
AUC and R2 are computed on held-out customers and shown on the dashboard.

## Prerequisites (RHEL VM)
JDK 11, Maven (`sudo dnf install maven`), HDFS + HBase, Kafka (`localhost:9092`), Phoenix Query Server (`localhost:8765`).
For the Python part: HBase Thrift server (`hbase thrift start -p 9090 &`) and `pip3 install -r ml/requirements.txt`.

## Run
```bash
mvn -q clean package
./run_all.sh
```
Optional settings: `RAW_FILE`, `HBASE_ZK`, `KAFKA_SERVERS`, `PHOENIX_URL` (Java); `HBASE_HOST`, `HBASE_PORT`, `PHOENIX_URL` (Python).

## Quick check without Kafka / HBase / Phoenix
```bash
java -cp target/crm-mvp.jar crm.SparkEtlLoad --csv --dry-run   # cleans RAW_FILE, saves data/clean/*.csv
python3 ml/crm_ml.py --source csv
java -cp target/crm-mvp.jar crm.DashboardApp
```
# Hbase
