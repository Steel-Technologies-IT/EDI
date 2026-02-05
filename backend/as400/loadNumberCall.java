public class LoadNumberCall {
    public static void main(String[] args) {
        // Define all variables
        String Server = args[0];  // Your AS400 server
        String Library = args[1];     // Your library name
        String User = args[2];     // Your username
        String Password = args[3]; // Your password
        
        // *** CHANGE: Get parameters from command line arguments or use defaults ***
        String Parm_Location = args[4];   
        String Parm_XREF = args[5];    
    
        com.ibm.as400.access.AS400 sys = new com.ibm.as400.access.AS400(Server);	
        String info = "";
        
        try { 		
            // *** CHANGE: Remove or reduce debug output for cleaner parsing ***
             System.out.println("=== CONNECTION SETUP ===");
             System.out.println("Server: " + Server);
             System.out.println("User: " + User);
             System.out.println("Library: " + Library);
             System.out.println("========================");
            
            sys.setUserId(User);
            sys.setPassword(Password);
            
            // System.out.println("Attempting to connect to AS400...");
            
            
            // Test connection first
            try {
                sys.connectService(com.ibm.as400.access.AS400.COMMAND);
                // System.out.println("✅ Connected to AS400 successfully!");
            } catch (Exception connError) {
                // *** CHANGE: Output structured error for Node.js parsing ***
                System.out.println("RESULT_ERROR:Connection failed - " + connError.getMessage());
                return;
            }

            // System.out.println("Setting up program call...");
            com.ibm.as400.access.ProgramCall pgm = new com.ibm.as400.access.ProgramCall(sys); 		
            com.ibm.as400.access.ProgramParameter[] parmList = new com.ibm.as400.access.ProgramParameter[3];		
            
            // System.out.println("Looking for program: " + Library + "/MI2570RG");
            pgm.setProgram(com.ibm.as400.access.QSYSObjectPathName.toPath(Library, "MI2570RG", "PGM"), parmList); 				

            String p1 = Parm_Location;
            String p2 = Parm_XREF;
            String p3 = "";  // Placeholder for third parameter (output)

            // Create AS400Text objects with correct lengths
            com.ibm.as400.access.AS400Text as1 = new com.ibm.as400.access.AS400Text(2);		
            com.ibm.as400.access.AS400Text as2 = new com.ibm.as400.access.AS400Text(5);
            com.ibm.as400.access.AS400Text as3 = new com.ibm.as400.access.AS400Text(13);				

            // Set up parameters
            parmList[0] = new com.ibm.as400.access.ProgramParameter(as1.toBytes(p1), 2);		
            parmList[1] = new com.ibm.as400.access.ProgramParameter(as2.toBytes(p2), 5);	
            parmList[2] = new com.ibm.as400.access.ProgramParameter(as3.toBytes(p3), 13);

            // Mark parameter 3 as output parameter
            parmList[2].setParameterType(com.ibm.as400.access.ProgramParameter.PASS_BY_REFERENCE);
            
            // *** CHANGE: Optional debug info - comment out for production ***
             System.out.println("=== INPUT PARAMETERS ===");
             System.out.println("Parameter 1 (Location): '" + p1 + "'");
             System.out.println("Parameter 2 (XREF): '" + p2 + "'");
            System.out.println("========================");
            
             System.out.println("Executing program...");
            
            // *** YOU MUST RUN THE PROGRAM FIRST ***
            boolean programResult = pgm.run();
            
            if (programResult) {
                 System.out.println("✅ Program executed successfully!");
             System.out.println("=== OUTPUT PARAMETERS ===");
                
                // *** CHANGE: Output structured result for Node.js parsing ***
                try {
                    // Convert the byte array back to a string using the AS400Text converter
                    String returnValue3 = as3.toObject(parmList[2].getOutputData()).toString().trim();
                    
                    // *** CHANGE: Output in structured format that Node.js can easily parse ***
                    System.out.println("RESULT_SUCCESS:" + returnValue3);
                    
                } catch (Exception outputError) {
                    // *** CHANGE: Structured error output ***
                    System.out.println("RESULT_ERROR:Output retrieval failed - " + outputError.getMessage());
                }
            } else {
                // Handle program execution failure
                com.ibm.as400.access.AS400Message[] messageList = pgm.getMessageList();  
                
                // *** CHANGE: Combine all error messages into one structured output ***
                StringBuilder errorMsg = new StringBuilder();
                for (int i = 0; i < messageList.length; i++) {
                    if (i > 0) errorMsg.append("; ");
                    errorMsg.append(messageList[i].getText());
                }
                System.out.println("RESULT_ERROR:Program execution failed - " + errorMsg.toString());
            }
            
        } catch (Exception e) {
            // *** CHANGE: Structured exception output ***
            System.out.println("RESULT_ERROR:Exception - " + e.getMessage());
        }			
        
        try {
            // System.out.println("Disconnecting from AS400...");
            sys.disconnectAllServices();
            // System.out.println("✅ Disconnected successfully.");
        } catch (Exception disconnectError) {
            // Silently handle disconnect errors
        }

        // *** CHANGE: Remove final result section - not needed for Node.js parsing ***
        // System.out.println("=== FINAL RESULT ===");
        // System.out.println(info);
        // System.out.println("===================");
    }
}