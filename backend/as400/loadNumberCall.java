public class LoadNumberCall {
    public static void main(String[] args) {
        // Define all variables
        String Server = "as400test";  // Your AS400 server
        String Library = "*LIBL";  // Your library name
        String User = "WEB_RF_Q";     // Your username
        String Password = "web_rf_q"; // Your password
        
        // Define your program parameters (replace with actual values)
        String Parm_Barcode_Number = "1234567890";  // 10 characters max
        String Parm_Batch_ID = "BATCH001";          // 10 characters max  

        com.ibm.as400.access.AS400 sys = new com.ibm.as400.access.AS400(Server);	
        String info = "";
        
        try { 		
            sys.setUserId(User);
            sys.setPassword(Password);

            com.ibm.as400.access.ProgramCall pgm = new com.ibm.as400.access.ProgramCall(sys); 		
            com.ibm.as400.access.ProgramParameter[] parmList = new com.ibm.as400.access.ProgramParameter[2];		
            pgm.setProgram(com.ibm.as400.access.QSYSObjectPathName.toPath(Library, "MR1220CL", "PGM"), parmList); 				

            String p1 = "", p2 = "";

            p1 = Parm_Barcode_Number;
            p2 = Parm_Batch_ID;

            com.ibm.as400.access.AS400Text as1 = new com.ibm.as400.access.AS400Text(70);		
		 	com.ibm.as400.access.AS400Text as2 = new com.ibm.as400.access.AS400Text(40);				
		
		 	parmList[0] = new com.ibm.as400.access.ProgramParameter (as1.toBytes(p1),70) ;		
			parmList[1] = new com.ibm.as400.access.ProgramParameter (as2.toBytes(p2),40) ;	

            // If any parameters are output or input/output, specify that:
            // parmList[0].setParameterType(com.ibm.as400.access.ProgramParameter.PASS_BY_REFERENCE);
            // parmList[1].setParameterType(com.ibm.as400.access.ProgramParameter.PASS_BY_REFERENCE);
                                            
            if (pgm.run() != true) { 		
                com.ibm.as400.access.AS400Message[] messageList = pgm.getMessageList();  
                System.out.println("Program did not run."); 
                
                // Print all error messages
                for (int i = 0; i < messageList.length; i++) {
                    System.out.println("Message " + i + ": " + messageList[i].getText());
                }
                info = "Error";
            } 		
            else {		
                System.out.println("Program executed successfully.");
                
                // Retrieve output values if any parameters return data
                // Example: if parameter 4 returns data
                
                // You can retrieve other parameters similarly:
                // String returnValue1 = as1.toObject(parmList[0].getOutputData()).toString().trim();
                // String returnValue2 = as2.toObject(parmList[1].getOutputData()).toString().trim();
                // String returnValue3 = as3.toObject(parmList[2].getOutputData()).toString().trim();
                
                info = "Success: "; // or whatever you want to return
            }		
                    
        } catch (Exception e) {			
            System.err.println("Exception occurred: " + e.getMessage());
            e.printStackTrace();
            info = "Exception: " + e.getMessage();
        }			
                    
        sys.disconnectAllServices();

        // Return or use the info variable as needed
        System.out.println("Final result: " + info);
    }
}