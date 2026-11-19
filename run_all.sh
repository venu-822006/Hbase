#!/usr/bin/env bash
# 1) Put your real CRM / sales export at data/raw/online_retail.csv  (or set RAW_FILE=...)
# 2) mvn -q clean package        -> target/crm-mvp.jar
# Needs running: HDFS + HBase (+ Thrift server for the Python ML part), Kafka, Phoenix Query Server.
set -e
JAVA="java --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.nio=ALL-UNNAMED --add-opens=java.base/sun.nio.ch=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED -cp target/crm-mvp.jar"
$JAVA crm.CreateTables       #   HBase tables              (Java)
$JAVA crm.KafkaProducerApp   # 1+2 capture + ingest         (Java + Kafka: your real data)
$JAVA crm.SparkEtlLoad       # 3+4 clean + load into HBase  (Java + Spark)
$JAVA crm.PhoenixViews       # 5 query layer                (Java + Phoenix)
python3 ml/crm_ml.py         # 6 machine learning           (Python only, Spark MLlib)
$JAVA crm.CrmFeedback        # 8 feedback to CRM            (Java)
$JAVA crm.DashboardApp       # 7 quick dashboard            (Java)  - Superset: see superset_queries.sql
echo "Done. Open dashboard.html in a browser."
