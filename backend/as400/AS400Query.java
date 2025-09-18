import java.sql.*;
import org.json.JSONArray;
import org.json.JSONObject;

public class AS400Query {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:as400://as400test/gxcorpqd";
        String user = "WEB_RF_Q";
        String password = "web_rf_q";
        String sql = args.length > 0 ? args[0] : "SELECT * FROM PO";

        Class.forName("com.ibm.as400.access.AS400JDBCDriver");
        Connection conn = DriverManager.getConnection(url, user, password);
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery(sql);

        JSONArray results = new JSONArray();
        ResultSetMetaData meta = rs.getMetaData();
        int colCount = meta.getColumnCount();

        while (rs.next()) {
            JSONObject row = new JSONObject();
            for (int i = 1; i <= colCount; i++) {
                row.put(meta.getColumnName(i), rs.getObject(i));
            }
            results.put(row);
        }
        System.out.println(results.toString());
        rs.close();
        stmt.close();
        conn.close();
    }
}