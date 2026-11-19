"""ML part (Python only) - Spark MLlib on REAL customer data (no synthetic labels).

Time-based set-up (standard for retail CRM):
  * "now"    = day after the last order in the data
  * "cutoff" = now - 180 days
  * Features are built from orders BEFORE the cutoff; labels come from what customers REALLY did in the 180 days after:
        churn label = customer placed no order after the cutoff      (Logistic Regression)
        spend label = money actually spent after the cutoff          (Linear Regression)
  * The trained models then score every customer using features as of "now" (churn risk + expected spend, next 180 days)
  * K-Means groups customers into 4 segments using RFM features as of "now".

Data source:  --source phoenix (default, SQL on HBase) | hbase (direct scans) | csv (data/clean/*.csv written by the Spark ETL)
Fast Inference: --predict --recency R --frequency F --monetary M --cancellations C
"""
import argparse, os, json, math, datetime
import numpy as np
import pandas as pd

HOST = os.getenv("HBASE_HOST", "localhost"); PORT = int(os.getenv("HBASE_PORT", "9090"))   # HBase Thrift server
PHOENIX = os.getenv("PHOENIX_URL", "http://localhost:8765/")                                # Phoenix Query Server
DATA = os.getenv("CRM_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
WINDOW_DAYS = 180
FEATS = ["recency", "frequency", "monetary", "aov", "tenure", "cancellations"]

ap = argparse.ArgumentParser()
ap.add_argument("--source", choices=["phoenix", "hbase", "csv"], default="csv")
ap.add_argument("--predict", action="store_true", help="Run fast single-customer inference using saved MLlib model parameters")
ap.add_argument("--recency", type=float, default=45.0, help="Days since last order")
ap.add_argument("--frequency", type=float, default=5.0, help="Total orders")
ap.add_argument("--monetary", type=float, default=2400.0, help="Total monetary spend")
ap.add_argument("--cancellations", type=float, default=0.0, help="Total cancellations / returns")
args = ap.parse_args()

def predict_single(recency, frequency, monetary, cancellations):
    params_path = os.path.join(DATA, "ml_model_params.json")
    if not os.path.exists(params_path):
        raise FileNotFoundError(f"ML model parameters file not found at {params_path}. Run training first.")
    
    with open(params_path, "r") as f:
        p = json.load(f)
    
    aov = monetary / max(frequency, 1.0)
    tenure = max(recency, 1.0) + 30.0
    
    raw = [
        float(recency),
        float(np.log1p(max(0.0, frequency))),
        float(np.log1p(max(0.0, monetary))),
        float(np.log1p(max(0.0, aov))),
        float(tenure),
        float(np.log1p(max(0.0, cancellations)))
    ]
    
    mean = p["scaler_mean"]
    std = p["scaler_std"]
    norm = [(raw[i] - mean[i]) / (std[i] if std[i] != 0 else 1.0) for i in range(len(raw))]
    
    # Churn probability (Logistic Regression Sigmoid)
    lr_z = p["churn_model"]["intercept"] + sum(norm[i] * p["churn_model"]["coefficients"][i] for i in range(len(norm)))
    churn_prob = round(1.0 / (1.0 + math.exp(-lr_z)), 4)
    
    # Spend prediction (Linear Regression)
    lin_pred = p["spend_model"]["intercept"] + sum(norm[i] * p["spend_model"]["coefficients"][i] for i in range(len(norm)))
    spend_pred = round(max(0.0, lin_pred), 2)
    
    # Segment Assignment (RFM-based cluster approximation)
    if monetary > 10000 or (monetary > 5000 and frequency > 15):
        segment = "Premium"
    elif monetary > 1800 or frequency > 6:
        segment = "Loyal"
    elif monetary > 500 or frequency > 2:
        segment = "Regular"
    else:
        segment = "Low value"
        
    # Campaign Rule
    if churn_prob >= 0.6:
        campaign = "M002 Win-back discount"
    elif (segment in ("Loyal", "Premium")) and churn_prob < 0.3:
        campaign = "M004 Loyalty rewards"
    elif frequency == 1 and recency < 30:
        campaign = "M001 Welcome offer"
    else:
        campaign = "M003 Seasonal sale"
        
    return {
        "recency": recency,
        "frequency": frequency,
        "monetary": monetary,
        "cancellations": cancellations,
        "churn_prob": churn_prob,
        "clv_pred": spend_pred,
        "segment": segment,
        "campaign": campaign
    }

if args.predict:
    res = predict_single(args.recency, args.frequency, args.monetary, args.cancellations)
    print(json.dumps(res, indent=2))
    exit(0)

def ts(s): return pd.to_datetime(s.astype(str), format="%Y%m%d%H%M%S")

def load():
    if args.source == "csv":
        c = pd.read_csv(os.path.join(DATA, "clean", "customers.csv"), dtype=str)
        o = pd.read_csv(os.path.join(DATA, "clean", "orders.csv"), dtype={"cid": str, "ts14": str})
        x = pd.read_csv(os.path.join(DATA, "clean", "cancellations.csv"), dtype={"cid": str, "ts14": str})
        c = c.rename(columns={"cid": "customer_id"}); o = o.rename(columns={"cid": "customer_id", "ts14": "ts"})
        x = x.rename(columns={"cid": "customer_id", "ts14": "ts"})
    elif args.source == "phoenix":
        import phoenixdb
        cur = phoenixdb.connect(PHOENIX, autocommit=True).cursor()
        def q(sql, cols):
            cur.execute(sql); return pd.DataFrame(cur.fetchall(), columns=cols)
        c = q('SELECT rk, "country", "first_order_date" FROM "crm_customer"', ["customer_id", "country", "first_order_date"])
        o = q('SELECT SUBSTR(rk,1,7), SUBSTR(rk,9,14), CAST("amount" AS DOUBLE) FROM "crm_orders"', ["customer_id", "ts", "amount"])
        x = q('SELECT SUBSTR(rk,1,7), SUBSTR(rk,9,14), CAST("amount" AS DOUBLE) FROM "crm_interaction" WHERE "type" = \'cancellation\'',
              ["customer_id", "ts", "amount"])
    else:
        import happybase
        t = happybase.Connection(HOST, port=PORT, timeout=60000)
        def scan(name, fam):
            return [(k.decode(), {c.decode().split(":")[1]: v.decode() for c, v in d.items()}) for k, d in t.table(name).scan(batch_size=2000, columns=[fam])]
        c = pd.DataFrame([{"customer_id": k, **d} for k, d in scan("crm_customer", "profile")])
        o = pd.DataFrame([{"customer_id": k[:7], "ts": k[8:22], "amount": float(d["amount"])} for k, d in scan("crm_orders", "info")])
        x = pd.DataFrame([{"customer_id": k[:7], "ts": k[8:22], "amount": float(d["amount"])} for k, d in scan("crm_interaction", "activity") if d.get("type") == "cancellation"])
    o["ts"] = ts(o["ts"])
    x = x if len(x) else pd.DataFrame({"customer_id": [], "ts": pd.to_datetime([]), "amount": []})
    if len(x): x["ts"] = ts(x["ts"])
    return c, o, x

def features(o, x, asof):
    a = o[o.ts < asof].groupby("customer_id").agg(last=("ts", "max"), first=("ts", "min"), frequency=("amount", "count"), monetary=("amount", "sum"))
    a["recency"] = (asof - a["last"]).dt.days; a["tenure"] = (asof - a["first"]).dt.days
    a["aov"] = a["monetary"] / a["frequency"]
    a["cancellations"] = x[x.ts < asof].groupby("customer_id").size().reindex(a.index).fillna(0)
    return a[FEATS]

cust, orders, canc = load()
now = orders.ts.max().normalize() + datetime.timedelta(days=1); cutoff = now - datetime.timedelta(days=WINDOW_DAYS)
print(f"customers={len(cust)} orders={len(orders)} | data {orders.ts.min():%Y-%m-%d} .. {orders.ts.max():%Y-%m-%d} | cutoff {cutoff:%Y-%m-%d}")

# ---- training set: features before cutoff, real outcome after cutoff ----
Xtr = features(orders, canc, cutoff)
after = orders[(orders.ts >= cutoff) & (orders.ts < now)].groupby("customer_id").amount.sum()
Xtr["spend"] = after.reindex(Xtr.index).fillna(0.0)
Xtr["churned"] = (Xtr["spend"] <= 0).astype(float)
if len(Xtr) < 200:
    raise SystemExit(f"Only {len(Xtr)} customers have orders before the cutoff - need a longer history (>= 1 year) to train.")
print(f"training customers={len(Xtr)}  churn rate={Xtr.churned.mean():.1%}")
Xnow = features(orders, canc, now)

# ---- Spark MLlib ----
from pyspark.sql import SparkSession
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml.clustering import KMeans
from pyspark.ml.classification import LogisticRegression
from pyspark.ml.regression import LinearRegression
from pyspark.ml.evaluation import BinaryClassificationEvaluator, RegressionEvaluator

spark = SparkSession.builder.appName("crm-ml").master("local[*]").config("spark.ui.enabled", "false").config("spark.sql.shuffle.partitions", "8").getOrCreate()
spark.sparkContext.setLogLevel("ERROR")

def prep(df):   # log-transform skewed money / count features
    d = df.copy()
    for c in ["frequency", "monetary", "aov", "cancellations"]: d[c] = np.log1p(d[c].clip(lower=0))
    return d

def to_spark(df, extra=()):
    d = prep(df).reset_index(); d = d.rename(columns={d.columns[0]: "customer_id"})
    return spark.createDataFrame(d[["customer_id"] + FEATS + list(extra)].astype({c: "float" for c in FEATS + list(extra)}))

asm = VectorAssembler(inputCols=FEATS, outputCol="raw")
tr = asm.transform(to_spark(Xtr, ["spend", "churned"]))
scaler = StandardScaler(inputCol="raw", outputCol="features", withMean=True, withStd=True).fit(tr)
tr = scaler.transform(tr)
train, test = tr.randomSplit([0.8, 0.2], seed=7)

lr = LogisticRegression(featuresCol="features", labelCol="churned", probabilityCol="prob").fit(train)
auc = BinaryClassificationEvaluator(labelCol="churned", rawPredictionCol="rawPrediction").evaluate(lr.transform(test))
lin = LinearRegression(featuresCol="features", labelCol="spend", predictionCol="spend_pred").fit(train)
r2 = RegressionEvaluator(labelCol="spend", predictionCol="spend_pred", metricName="r2").evaluate(lin.transform(test))

now_df = scaler.transform(asm.transform(to_spark(Xnow)))
km = KMeans(k=4, seed=1, featuresCol="features", predictionCol="cluster").fit(now_df)
scored = lin.transform(lr.transform(km.transform(now_df)))
out = scored.select("customer_id", "cluster", "prob", "spend_pred").toPandas()
out["churn_prob"] = out["prob"].apply(lambda v: round(float(v[1]), 4))
out["clv_pred"] = out["spend_pred"].clip(lower=0).round(2)
res = out.merge(Xnow.reset_index().rename(columns={"index": "customer_id"}), on="customer_id").merge(cust[["customer_id", "country"]], on="customer_id", how="left")
order = res.groupby("cluster").monetary.mean().sort_values().index          # name clusters by average spend
res["segment"] = res["cluster"].map(dict(zip(order, ["Low value", "Regular", "Loyal", "Premium"])))
res = res[["customer_id", "country", "segment", "churn_prob", "clv_pred", "recency", "frequency", "monetary", "cancellations"]]
os.makedirs(DATA, exist_ok=True)
res.to_csv(os.path.join(DATA, "results.csv"), index=False)
open(os.path.join(DATA, "metrics.txt"), "w").write(f"{auc:.3f},{r2:.3f},{len(res)},{now:%Y-%m-%d}")

# Save model parameters for instantaneous API inference
model_meta = {
    "features": FEATS,
    "scaler_mean": [float(v) for v in scaler.mean.toArray()],
    "scaler_std": [float(v) for v in scaler.std.toArray()],
    "churn_model": {
        "type": "LogisticRegression",
        "intercept": float(lr.intercept),
        "coefficients": [float(v) for v in lr.coefficients.toArray()],
        "auc": float(round(auc, 4))
    },
    "spend_model": {
        "type": "LinearRegression",
        "intercept": float(lin.intercept),
        "coefficients": [float(v) for v in lin.coefficients.toArray()],
        "r2": float(round(r2, 4))
    },
    "cluster_order": [int(x) for x in order.tolist()],
    "segments": ["Low value", "Regular", "Loyal", "Premium"],
    "cutoff_date": str(cutoff.date()),
    "now_date": str(now.date()),
    "customers_count": len(res)
}
with open(os.path.join(DATA, "ml_model_params.json"), "w") as f:
    json.dump(model_meta, f, indent=2)

if args.source != "csv":   # write predictions back into HBase, family 'ml' (visible through Phoenix)
    import happybase
    t = happybase.Connection(HOST, port=PORT, timeout=60000).table("crm_customer")
    with t.batch(batch_size=2000) as b:
        for r in res.itertuples():
            b.put(r.customer_id.encode(), {b"ml:segment": r.segment.encode(), b"ml:churn_prob": str(r.churn_prob).encode(), b"ml:clv_pred": str(r.clv_pred).encode()})
    print("predictions written back to HBase (crm_customer, family 'ml')")
print(res.segment.value_counts().to_string())
print(f"Churn model AUC = {auc:.3f} | Spend model R2 = {r2:.3f}   (evaluated on held-out customers)")
spark.stop()
