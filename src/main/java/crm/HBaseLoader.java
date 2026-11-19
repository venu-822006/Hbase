package crm;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;
import org.apache.spark.api.java.function.ForeachPartitionFunction;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import java.util.*;

/** Writes a Spark Dataset into an HBase table. The Dataset needs a "rowkey" column; cols maps "family:qualifier" -> column name. */
public class HBaseLoader {
    public static void load(Dataset<Row> df, String table, Map<String, String> cols) {
        final String zk = Common.ZK, zkPort = Common.ZK_PORT;
        final Map<String, String> c = new LinkedHashMap<>(cols);
        df.foreachPartition((ForeachPartitionFunction<Row>) it -> {
            try (Connection conn = HBaseUtil.connect(zk, zkPort);
                 BufferedMutator mut = conn.getBufferedMutator(TableName.valueOf(table))) {
                while (it.hasNext()) {
                    Row r = it.next();
                    Put put = new Put(Bytes.toBytes(r.<String>getAs("rowkey")));
                    for (Map.Entry<String, String> e : c.entrySet()) {
                        String[] fq = e.getKey().split(":");
                        Object v = r.getAs(e.getValue());
                        if (v != null) put.addColumn(Bytes.toBytes(fq[0]), Bytes.toBytes(fq[1]), Bytes.toBytes(v.toString()));
                    }
                    mut.mutate(put);
                }
            }
        });
        System.out.println("  loaded -> HBase table " + table);
    }
}
