# Azure Container App Environment Configuration

## Required Secrets

Set these as **secrets** in Azure Container App:

### SMB Mount Credentials
- `smb-username`: Domain username (e.g., `STEELTECHNOLOGIES\username` or `username@steeltechnologies.com`)
- `smb-password`: Domain user password
- `smb-domain`: Domain name (e.g., `STEELTECHNOLOGIES`)

## Environment Variables

### SMB Configuration
```bash
SMB_SERVER=10.202.0.9
SMB_SHARE=E$
SMB_USERNAME=secretref:smb-username
SMB_PASSWORD=secretref:smb-password
SMB_DOMAIN=secretref:smb-domain
```

### Application Paths (Container Paths)
```bash
REACT_APP_LISTEN_PATH=/mnt/edifiles/
REACT_APP_CLEO_PATH=/mnt/edifiles/cleo/
```

### Other Application Variables
```bash
REACT_APP_Server_Port=5000
REACT_APP_FRONTEND_PORT=3000
REACT_APP_HOST=<your-app-url>
REACT_APP_ADMIN_GROUP=<your-admin-group>
REACT_APP_REDIRECT_URI=<your-redirect-uri>
REACT_APP_API_URL=<your-api-url>
REACT_APP_CLIENT_ID=<your-client-id>
REACT_APP_CLIENT_SECRET=secretref:client-secret
REACT_APP_INVEX_DB=<connection-string>
REACT_APP_AS400_URL=<as400-url>
REACT_APP_AS400_USER=secretref:as400-user
REACT_APP_AS400_PASSWORD=secretref:as400-password
REACT_APP_AS400_SERVER=<as400-server>
REACT_APP_AS400_LIBRARY=<as400-library>
```

## Azure CLI Commands

### 1. Create Secrets
```bash
az containerapp secret set \
  --name edi-backend \
  --resource-group your-resource-group \
  --secrets \
    smb-username="DOMAIN\\username" \
    smb-password="your-password" \
    smb-domain="YOURDOMAIN" \
    client-secret="your-oauth-secret" \
    as400-user="your-as400-user" \
    as400-password="your-as400-password"
```

### 2. Set Environment Variables
```bash
az containerapp update \
  --name edi-backend \
  --resource-group your-resource-group \
  --set-env-vars \
    SMB_SERVER=10.202.0.9 \
    SMB_SHARE=E$ \
    SMB_USERNAME=secretref:smb-username \
    SMB_PASSWORD=secretref:smb-password \
    SMB_DOMAIN=secretref:smb-domain \
    REACT_APP_LISTEN_PATH=/mnt/edifiles/ \
    REACT_APP_CLEO_PATH=/mnt/edifiles/cleo/ \
    REACT_APP_Server_Port=5000 \
    REACT_APP_FRONTEND_PORT=3000
```

### 3. Enable VNet Integration
```bash
az containerapp update \
  --name edi-backend \
  --resource-group your-resource-group \
  --vnet-name your-vnet-name \
  --subnet your-container-subnet
```

## Network Requirements

### NSG Rules
Ensure Network Security Group allows:
- **From**: Container App subnet
- **To**: 10.202.0.9 (file server)
- **Ports**: 445 (SMB), 139 (NetBIOS)

### DNS
Ensure container can resolve `10.202.0.9` or use IP directly (as configured above)

## Deployment Steps

1. **Build and push Docker image**:
   ```bash
   docker build -t your-acr.azurecr.io/edi-backend:latest ./backend
   docker push your-acr.azurecr.io/edi-backend:latest
   ```

2. **Set secrets** (use command above)

3. **Set environment variables** (use command above)

4. **Deploy/Update container**:
   ```bash
   az containerapp update \
     --name edi-backend \
     --resource-group your-resource-group \
     --image your-acr.azurecr.io/edi-backend:latest
   ```

## Troubleshooting

### Check if SMB is mounted
```bash
az containerapp exec \
  --name edi-backend \
  --resource-group your-resource-group \
  --command "mount | grep cifs"
```

### Check logs
```bash
az containerapp logs show \
  --name edi-backend \
  --resource-group your-resource-group \
  --follow
```

### Test file access
```bash
az containerapp exec \
  --name edi-backend \
  --resource-group your-resource-group \
  --command "ls -la /mnt/edifiles"
```
