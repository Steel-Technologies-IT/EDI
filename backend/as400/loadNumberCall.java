public class LoadNumberCall {
    public static void main(String[] args) {
        if (args.length < 6) {
            System.out.println("RESULT_ERROR:Invalid arguments. Expected: hostname library user password location xref");
            return;
        }

        String Server = args[0];
        String Library = args[1];
        String User = args[2];
        String Password = args[3];
        String Parm_Location = args[4];
        String Parm_XREF = args[5];

        System.out.println("=== CONNECTION SETUP ===");
        System.out.println("Server: " + Server);
        System.out.println("Library: " + Library);
        System.out.println("Location: " + Parm_Location);
        System.out.println("XREF: " + Parm_XREF);
        System.out.println("========================");

        com.ibm.as400.access.AS400 sys = null;
        
        try {
            sys = new com.ibm.as400.access.AS400(Server, User, Password);
            
            // Set socket timeout to 30 seconds to prevent hanging
            sys.getSocketProperties().setSoTimeout(30000);
            
            System.out.println("Attempting to connect to AS400...");
            
            // Test connection with timeout
            try {
                sys.connectService(com.ibm.as400.access.AS400.COMMAND);
                System.out.println("✅ Connected to AS400 successfully!");
            } catch (Exception connError) {
                System.out.println("RESULT_ERROR:Connection failed - " + connError.getMessage());
                connError.printStackTrace();
                return;
            }

            System.out.println("Setting up program call for: " + Library + "/MI2570RG");
            
            com.ibm.as400.access.ProgramCall pgm = new com.ibm.as400.access.ProgramCall(sys);
            com.ibm.as400.access.ProgramParameter[] parmList = new com.ibm.as400.access.ProgramParameter[3];

            // Create AS400Text objects with correct lengths
            com.ibm.as400.access.AS400Text as1 = new com.ibm.as400.access.AS400Text(2);
            com.ibm.as400.access.AS400Text as2 = new com.ibm.as400.access.AS400Text(5);
            com.ibm.as400.access.AS400Text as3 = new com.ibm.as400.access.AS400Text(13);

            // Set up parameters
            parmList[0] = new com.ibm.as400.access.ProgramParameter(as1.toBytes(Parm_Location), 2);
            parmList[1] = new com.ibm.as400.access.ProgramParameter(as2.toBytes(Parm_XREF), 5);
            parmList[2] = new com.ibm.as400.access.ProgramParameter(13);  // Output parameter

            // Set program to call
            pgm.setProgram(com.ibm.as400.access.QSYSObjectPathName.toPath(Library, "MI2570RG", "PGM"), parmList);

            System.out.println("Executing program...");

            // Execute the program
            boolean programResult = pgm.run();

            if (programResult) {
                System.out.println("✅ Program executed successfully!");

                try {
                    // Get output from parameter 3
                    byte[] outputData = parmList[2].getOutputData();
                    if (outputData != null) {
                        String returnValue = as3.toObject(outputData).toString().trim();
                        System.out.println("RESULT_SUCCESS:" + returnValue);
                    } else {
                        System.out.println("RESULT_ERROR:No output data returned from program");
                    }
                } catch (Exception outputError) {
                    System.out.println("RESULT_ERROR:Output retrieval failed - " + outputError.getMessage());
                    outputError.printStackTrace();
                }
            } else {
                // Handle program execution failure
                com.ibm.as400.access.AS400Message[] messageList = pgm.getMessageList();
                StringBuilder errorMsg = new StringBuilder();
                
                for (int i = 0; i < messageList.length; i++) {
                    if (i > 0) errorMsg.append("; ");
                    errorMsg.append(messageList[i].getText());
                }
                
                System.out.println("RESULT_ERROR:Program execution failed - " + errorMsg.toString());
            }

        } catch (Exception e) {
            System.out.println("RESULT_ERROR:Exception - " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Always disconnect
            if (sys != null) {
                try {
                    System.out.println("Disconnecting from AS400...");
                    sys.disconnectAllServices();
                    System.out.println("✅ Disconnected successfully.");
                } catch (Exception disconnectError) {
                    System.err.println("Warning: Failed to disconnect - " + disconnectError.getMessage());
                }
            }
        }
    }
}