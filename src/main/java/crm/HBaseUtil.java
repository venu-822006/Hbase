package crm;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.hbase.HBaseConfiguration;
import org.apache.hadoop.hbase.client.*;
import java.io.IOException;

public class HBaseUtil {
    public static Connection connect() throws IOException { return connect(Common.ZK, Common.ZK_PORT); }
    public static Connection connect(String zk, String port) throws IOException {
        Configuration c = HBaseConfiguration.create();
        c.set("hbase.zookeeper.quorum", zk);
        c.set("hbase.zookeeper.property.clientPort", port);
        return ConnectionFactory.createConnection(c);
    }
}
