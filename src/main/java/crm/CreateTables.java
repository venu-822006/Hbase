package crm;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;
import java.util.Map;

/** Step 2: create the HBase tables (Customer, Orders, Interaction, Campaign). */
public class CreateTables {
    public static void main(String[] args) throws Exception {
        try (Connection conn = HBaseUtil.connect(); Admin admin = conn.getAdmin()) {
            for (Map.Entry<String, String[]> e : Common.TABLES.entrySet()) {
                TableName tn = TableName.valueOf(e.getKey());
                if (admin.tableExists(tn)) { System.out.println("exists : " + tn); continue; }
                TableDescriptorBuilder b = TableDescriptorBuilder.newBuilder(tn);
                for (String f : e.getValue()) b.setColumnFamily(ColumnFamilyDescriptorBuilder.of(Bytes.toBytes(f)));
                admin.createTable(b.build());
                System.out.println("created: " + tn + " families=" + String.join(",", e.getValue()));
            }
        }
    }
}
