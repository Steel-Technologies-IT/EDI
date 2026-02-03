#!/bin/bash

echo "Starting EDI Backend Container..."

# Check if required environment variables are set
if [ -z "$SMB_SERVER" ] || [ -z "$SMB_SHARE" ] || [ -z "$SMB_USERNAME" ] || [ -z "$SMB_PASSWORD" ]; then
    echo "ERROR: SMB credentials not configured. Please set SMB_SERVER, SMB_SHARE, SMB_USERNAME, and SMB_PASSWORD environment variables."
    exit 1
fi

echo "Mounting SMB share //$SMB_SERVER/$SMB_SHARE to /mnt/edifiles..."
echo "Using username: $SMB_USERNAME"
echo "Using domain: $SMB_DOMAIN"


# Mount SMB share with domain credentials
# Using vers=3.0 for SMB 3.0 compatibility
mount -t cifs //$SMB_SERVER/$SMB_SHARE /mnt/edifiles \
  -o username=$SMB_USERNAME,password=$SMB_PASSWORD,domain=$SMB_DOMAIN,vers=3.0,dir_mode=0777,file_mode=0777,uid=1000,gid=1000 2>&1

# Check if mount was successful
MOUNT_EXIT_CODE=$?
if [ $MOUNT_EXIT_CODE -eq 0 ]; then
    echo "✅ SMB share mounted successfully"
else
    echo "❌ Failed to mount SMB share (exit code: $MOUNT_EXIT_CODE)"
    echo "Debugging information:"
    echo "  - Checking network connectivity to $SMB_SERVER..."
    ping -c 2 $SMB_SERVER 2>&1 || echo "  ⚠️ Ping failed"
    echo "  - Checking if SMB port 445 is accessible..."
    nc -zv $SMB_SERVER 445 2>&1 || echo "  ⚠️ Port 445 not accessible"
    echo "  - Checking if cifs-utils is installed..."
    which mount.cifs || echo "  ⚠️ mount.cifs not found"
    exit 1
fi

# Create required subdirectories if they don't exist
echo "Creating required subdirectories..."
mkdir -p /mnt/edifiles/inboundSNF
mkdir -p /mnt/edifiles/outboundJSON
mkdir -p /mnt/edifiles/JSONS
mkdir -p /mnt/edifiles/SNFS
mkdir -p /mnt/edifiles/processedSNF
mkdir -p /mnt/edifiles/processedJSON
mkdir -p /mnt/edifiles/cleo

echo "✅ Directory structure ready"
echo "Starting Node.js application..."

# Start the Node.js application
exec node server.js
