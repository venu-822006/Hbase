package crm;

import java.nio.file.*;
import java.sql.*;

/** Step 5 (Query layer): create Apache Phoenix SQL views over the HBase tables (needs the Phoenix Query Server). */
public class PhoenixViews {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:phoenix:thin:url=" + Common.PHOENIX + ";serialization=PROTOBUF";
        String sql = new String(Files.readAllBytes(Paths.get("phoenix_views.sql")));
        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            c.setAutoCommit(true);
            for (String part : sql.split(";")) {
                StringBuilder sb = new StringBuilder();
                for (String line : part.split("\n")) if (!line.trim().startsWith("--")) sb.append(line).append("\n");
                String stmt = sb.toString().trim();
                if (stmt.isEmpty()) continue;
                st.execute(stmt);
                System.out.println("ok: " + stmt.substring(0, Math.min(60, stmt.length())).replace("\n", " "));
            }
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM \"crm_customer\"")) {
                rs.next(); System.out.println("customers visible through Phoenix: " + rs.getLong(1));
            }
        }
    }
}
