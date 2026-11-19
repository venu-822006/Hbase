package crm;

import java.nio.file.*;
import java.sql.*;

/** Step 5 (Query layer): create Apache Phoenix SQL views over the HBase tables (needs the Phoenix Query Server). */
public class PhoenixViews {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:phoenix:thin:url=" + Common.PHOENIX + ";serialization=PROTOBUF";
        Path sqlPath = Paths.get("phoenix_views.sql");
        if (!Files.exists(sqlPath)) {
            sqlPath = Paths.get("../phoenix_views.sql");
        }
        if (!Files.exists(sqlPath)) {
            System.err.println("Notice: phoenix_views.sql not found. Skipping view creation.");
            return;
        }

        String sql = new String(Files.readAllBytes(sqlPath));
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
        } catch (Exception e) {
            System.out.println("Notice: Phoenix Query Server not available at " + Common.PHOENIX + " (" + e.getMessage() + ").");
            System.out.println("Continuing pipeline: direct HBase storage and Spark MLlib operate directly.");
        }
    }
}
