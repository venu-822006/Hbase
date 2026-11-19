Put your REAL customer / sales export here as:  data/raw/online_retail.csv   (or set RAW_FILE=/path/to/file.csv)

Expected columns (header names are matched ignoring case, spaces and underscores):
  Invoice (or InvoiceNo), StockCode, Description, Quantity, InvoiceDate, Price (or UnitPrice), Customer ID, Country

InvoiceDate formats accepted:  2011-03-01 10:15:00   or   3/1/2011 10:15
Invoice numbers starting with "C" are treated as cancellations / returns.
Customer ID must be numeric (up to 6 digits). Rows without a customer ID are rejected by the Spark ETL.

The public "Online Retail II" dataset (UCI Machine Learning Repository, 2009-2011 UK online retailer) uses exactly this layout.
At least about 1 year of history is needed because the ML models are trained on a 180-day look-ahead.
