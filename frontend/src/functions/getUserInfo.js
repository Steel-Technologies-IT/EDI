import { msalInstance, loginRequest  } from "../Security/Config";


//#region Entra Info Fetches
//Gathers All User Info Needed For Security From Entra ID
//Using the Microsoft Graph API
//Documentation On Using Microsoft Graph API : https://learn.microsoft.com/en-us/graph/use-the-api 
const getUserInfo = async (accessToken) => {
    console.log('user loading')
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;
    headers.append("Authorization", bearer);
  
    const options = {
      method: "GET",
      headers: headers,
    };
  try {
    //Grabs the User Info From Entra
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", options);
    const user = await userResponse.json();

    //Grabs the Groups that the User is apart of
    const groupsResponse = await fetch("https://graph.microsoft.com/v1.0/me/memberOf", options);
    const groupsData = await groupsResponse.json();
    // Filter out only security groups
    const securityGroups = groupsData.value.filter(group => !group.groupTypes || group.groupTypes.length === 0);
  
    //Fetches The Sub Groups that you are apart of 
    async function fetchSubGroups(group) {
      try {
        const subGroupsResponse = await fetch(`https://graph.microsoft.com/v1.0/groups/${group}/memberOf`, options);
        const subGroupsData = await subGroupsResponse.json();
        return subGroupsData.value.filter(subGroup => (!subGroup.groupTypes || subGroup.groupTypes.length === 0) && subGroup.length !== 0 );
      } catch (error) {
        console.error(`Failed to fetch subgroups for group ${group}:`, error);
        return [];
      }
    }
  
  
  // MARK: Fetch subgroups for each security group
  const fetchAllSubGroups = async () => {
    //Make sure the all the Requests are settled before moving on
    const subGroupsPromises = securityGroups.map(group => () => fetchSubGroups(group.id));
    const subGroupsResults = await Promise.allSettled(subGroupsPromises);
    
    //For each sub security group that has a value.length > 0 
    //Add the Sub Group to security groups
    subGroupsResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length) {
        securityGroups.push(...result.value)
      } else {  
        
      }
    });
    
  };
  
  await fetchAllSubGroups();
  
  
  //Returns the Security Groups and User Info
  return { user, groups: securityGroups };

  } catch(error) {
    console.error("error fetching user info or groups:0", error);
    return {user:null, groups: [] };
  };}
  //#endregion
  


  export const CheckAccount = async () => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
        
        const userInfo = await getUserInfo(tokenResponse.accessToken);
        

        const gro = userInfo.groups.map(group => group.displayName)
        const user = userInfo.user

        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('groups', JSON.stringify(gro));
        return { group: gro, usr: user };
        
      } catch (error) {
        console.log("Error acquiring token silently:", error);
      }
    } 
  };



