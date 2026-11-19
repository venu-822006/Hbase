package crm.api.config;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.hbase.HBaseConfiguration;
import org.apache.hadoop.hbase.client.Connection;
import org.apache.hadoop.hbase.client.ConnectionFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.io.IOException;

@org.springframework.context.annotation.Configuration
public class HBaseConfig {

    private static final Logger log = LoggerFactory.getLogger(HBaseConfig.class);

    @Value("${hbase.zookeeper.quorum:localhost}")
    private String zkQuorum;

    @Value("${hbase.zookeeper.property.clientPort:2181}")
    private int zkPort;

    @Value("${hbase.client.retries.number:2}")
    private int retries;

    @Value("${hbase.rpc.timeout:10000}")
    private int rpcTimeout;

    @Value("${hbase.client.operation.timeout:15000}")
    private int opTimeout;

    @Bean(destroyMethod = "close")
    public Connection hbaseConnection() {
        try {
            Configuration config = HBaseConfiguration.create();
            config.set("hbase.zookeeper.quorum", zkQuorum);
            config.setInt("hbase.zookeeper.property.clientPort", zkPort);
            config.setInt("hbase.client.retries.number", retries);
            config.setInt("hbase.rpc.timeout", rpcTimeout);
            config.setInt("hbase.client.operation.timeout", opTimeout);

            log.info("Connecting to HBase cluster at {}:{}...", zkQuorum, zkPort);
            return ConnectionFactory.createConnection(config);
        } catch (Exception e) {
            log.warn("Failed to initialize live HBase connection: {}. Fallback dataset will be used.", e.getMessage());
            return null;
        }
    }
}
