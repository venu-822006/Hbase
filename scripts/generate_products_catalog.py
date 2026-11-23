#!/usr/bin/env python3
import os
import sys
import pandas as pd
import numpy as np

def categorize(desc):
    if not isinstance(desc, str):
        return "General Merchandise"
    d = desc.upper()
    if any(k in d for k in ["LIGHT", "HEART", "CANDLE", "LANTERN", "T-LIGHT", "LAMP", "MIRROR", "FRAME", "DECOR", "CLOCK"]):
        return "Decor & Lighting"
    if any(k in d for k in ["MUG", "BOWL", "PLATE", "CUP", "CAKESTAND", "CUTLERY", "TEAPOT", "SPOON", "GLASS", "DISH", "BOTTLE", "JAR", "COASTER", "BAKING"]):
        return "Kitchen & Dining"
    if any(k in d for k in ["BAG", "SHOPPER", "TOTE", "LUGGAGE", "CASE", "WALLET", "PURSE", "BACKPACK", "JUMBO BAG"]):
        return "Bags & Accessories"
    if any(k in d for k in ["PEN", "PENCIL", "NOTEBOOK", "CARD", "PAPER", "STICKER", "TAPE", "CRAFT", "SCISSORS", "RIBBON", "WRAP"]):
        return "Stationery & Craft"
    if any(k in d for k in ["DOORMAT", "CUSHION", "BLANKET", "TOWEL", "HOOK", "BOX", "STORAGE", "PLANTER", "GARDEN", "FLOWER"]):
        return "Home & Living"
    if any(k in d for k in ["TOY", "GAME", "DOLL", "PUZZLE", "BADGE", "KEYRING", "PARTY", "CHRISTMAS", "XMAS", "GIFT", "BUNTING"]):
        return "Gifts & Seasonal"
    return "General Merchandise"

def main():
    raw_path = "data/raw/online_retail.csv"
    out_path = "data/clean/products.csv"
    
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} not found")
        sys.exit(1)

    print(f"Reading {raw_path}...")
    # Read relevant columns
    cols = ['Invoice', 'StockCode', 'Description', 'Quantity', 'Price', 'Customer ID']
    df = pd.read_csv(raw_path, usecols=cols, dtype={
        'Invoice': str,
        'StockCode': str,
        'Description': str,
        'Quantity': float,
        'Price': float,
        'Customer ID': str
    }, low_memory=False)

    print(f"Loaded {len(df):,} total rows.")

    # Clean stock codes and descriptions
    df['StockCode'] = df['StockCode'].astype(str).str.strip().str.upper()
    df['Description'] = df['Description'].astype(str).str.strip()
    df['Invoice'] = df['Invoice'].astype(str).str.strip()

    # Filter out empty or non-merchandise system codes (like POST, D, M, BANK CHARGES, etc. if invalid)
    # But keep all valid merchandise stock codes
    valid_mask = df['StockCode'].notna() & (df['StockCode'] != '') & (df['StockCode'] != 'NAN')
    df = df[valid_mask]

    # Split sales vs cancellations
    is_cancel = df['Invoice'].str.startswith('C', na=False) | (df['Quantity'] < 0)
    sales_df = df[~is_cancel & (df['Quantity'] > 0) & (df['Price'] > 0)].copy()
    cancel_df = df[is_cancel].copy()

    # Calculate revenue for sales
    sales_df['Revenue'] = sales_df['Quantity'] * sales_df['Price']

    print(f"Aggregating products across {len(sales_df):,} sales rows and {len(cancel_df):,} cancellation rows...")

    # Group sales by StockCode
    # Get primary description (most frequent description for each code)
    desc_series = sales_df.groupby('StockCode')['Description'].agg(
        lambda s: s.mode().iloc[0] if not s.mode().empty and str(s.mode().iloc[0]).strip() not in ['', 'nan', 'NaN'] else s.iloc[0]
    )

    sales_agg = sales_df.groupby('StockCode').agg(
        units_sold=('Quantity', 'sum'),
        total_revenue=('Revenue', 'sum'),
        avg_price=('Price', 'mean'),
        order_count=('Invoice', 'nunique'),
        customer_count=('Customer ID', 'nunique')
    )

    cancel_agg = cancel_df.groupby('StockCode').agg(
        units_cancelled=('Quantity', lambda x: abs(x.sum())),
        cancel_count=('Invoice', 'nunique')
    )

    # Combine
    products = sales_agg.join(cancel_agg, how='left').fillna(0)
    products['description'] = desc_series
    products['description'] = products['description'].fillna('UNSPECIFIED MERCHANDISE')
    # If description is still invalid/empty
    products.loc[products['description'].str.strip() == '', 'description'] = 'SPECIAL MERCHANDISE'

    # Filter out pure noise / test codes with 0 units sold
    products = products[products['units_sold'] > 0].copy()

    # Derived fields
    products['category'] = products['description'].apply(categorize)
    products['units_sold'] = products['units_sold'].astype(int)
    products['units_cancelled'] = products['units_cancelled'].astype(int)
    products['total_revenue'] = products['total_revenue'].round(2)
    products['avg_price'] = products['avg_price'].round(2)
    products['order_count'] = products['order_count'].astype(int)
    products['cancel_count'] = products['cancel_count'].astype(int)
    
    # Cancellation rate
    products['cancellation_rate'] = (
        products['cancel_count'] / (products['order_count'] + products['cancel_count'])
    ).round(4)

    # Reset index and sort by total revenue descending
    products = products.reset_index()
    products.rename(columns={'StockCode': 'stock_code'}, inplace=True)
    products.sort_values(by='total_revenue', ascending=False, inplace=True)

    # Reorder columns
    cols_order = [
        'stock_code', 'description', 'category', 'avg_price', 
        'units_sold', 'units_cancelled', 'total_revenue', 
        'order_count', 'cancel_count', 'customer_count', 'cancellation_rate'
    ]
    products = products[cols_order]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    products.to_csv(out_path, index=False)
    print(f"Successfully generated {out_path} with {len(products):,} unique product SKUs.")
    print("\nTop 5 Grossing Products:")
    print(products.head(5)[['stock_code', 'description', 'category', 'total_revenue', 'units_sold']])

if __name__ == '__main__':
    main()
