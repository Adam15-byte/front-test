# Azure Full-Stack App with Virtual Network Security

This project demonstrates how to deploy a simple full-stack application to Azure App Services with Virtual Network integration for enhanced security. The backend API is only accessible through the frontend application, not from external sources.

## Project Structure

```
├── backend/                 # Node.js Express backend
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── web.config          # IIS configuration for Azure
├── src/                    # React frontend
│   └── App.tsx            # Main frontend component
├── .env.example           # Environment variables template
└── README.md             # This file
```

## Local Development

### Backend

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:8000
```

### Frontend

```bash
npm install
npm run dev
# App runs on http://localhost:5173
```

## Azure Deployment with Virtual Network Security

### Prerequisites

1. Azure subscription
2. Azure CLI installed and logged in
3. Resource group created

```bash
# Login to Azure
az login

# Create resource group (if not exists)
az group create --name myResourceGroup --location "East US"
```

### Step 1: Create Virtual Network

```bash
# Create Virtual Network
az network vnet create \
  --resource-group myResourceGroup \
  --name myVNet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name frontend-subnet \
  --subnet-prefix 10.0.1.0/24

# Create backend subnet
az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name backend-subnet \
  --address-prefix 10.0.2.0/24
```

### Step 2: Create App Service Plans

```bash
# Create App Service Plan for frontend (Standard tier minimum for VNet integration)
az appservice plan create \
  --name frontend-plan \
  --resource-group myResourceGroup \
  --sku S1 \
  --is-linux

# Create App Service Plan for backend
az appservice plan create \
  --name backend-plan \
  --resource-group myResourceGroup \
  --sku S1 \
  --is-linux
```

### Step 3: Create App Services

```bash
# Create backend app service
az webapp create \
  --resource-group myResourceGroup \
  --plan backend-plan \
  --name your-unique-backend-name \
  --runtime "NODE|18-lts"

# Create frontend app service
az webapp create \
  --resource-group myResourceGroup \
  --plan frontend-plan \
  --name your-unique-frontend-name \
  --runtime "NODE|18-lts"
```

### Step 4: Configure Virtual Network Integration

```bash
# Enable VNet integration for frontend app
az webapp vnet-integration add \
  --resource-group myResourceGroup \
  --name your-unique-frontend-name \
  --vnet myVNet \
  --subnet frontend-subnet

# Enable VNet integration for backend app
az webapp vnet-integration add \
  --resource-group myResourceGroup \
  --name your-unique-backend-name \
  --vnet myVNet \
  --subnet backend-subnet
```

### Step 5: Configure Backend Access Restrictions

This is the crucial step that secures your backend API:

```bash
# Add access restriction to backend - deny all external access
az webapp config access-restriction add \
  --resource-group myResourceGroup \
  --name your-unique-backend-name \
  --rule-name "DenyAll" \
  --action Deny \
  --ip-address 0.0.0.0/0 \
  --priority 100

# Allow access only from frontend subnet
az webapp config access-restriction add \
  --resource-group myResourceGroup \
  --name your-unique-backend-name \
  --rule-name "AllowFrontendSubnet" \
  --action Allow \
  --subnet "/subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/virtualNetworks/myVNet/subnets/frontend-subnet" \
  --priority 90
```

**Note**: Replace `{subscription-id}` with your actual Azure subscription ID.

### Step 6: Configure Environment Variables

```bash
# Set backend environment variables
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name your-unique-backend-name \
  --settings NODE_ENV=production \
             FRONTEND_URL=https://your-unique-frontend-name.azurewebsites.net

# Set frontend environment variables
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name your-unique-frontend-name \
  --settings VITE_BACKEND_URL=https://your-unique-backend-name.azurewebsites.net
```

### Step 7: Deploy Applications

#### Deploy Backend

```bash
# Create deployment package for backend
cd backend
zip -r ../backend.zip . -x "node_modules/*"
cd ..

# Deploy backend
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name your-unique-backend-name \
  --src backend.zip
```

#### Deploy Frontend

```bash
# Build frontend
npm run build

# Create deployment package
cd dist
zip -r ../frontend.zip .
cd ..

# Deploy frontend
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name your-unique-frontend-name \
  --src frontend.zip
```

### Step 8: Verify Security Configuration

1. **Test Backend Accessibility**:

   - Try accessing `https://your-unique-backend-name.azurewebsites.net/api/health` directly in a browser
   - This should be **blocked** (403 Forbidden or timeout)

2. **Test Frontend Functionality**:
   - Visit `https://your-unique-frontend-name.azurewebsites.net`
   - Click "Check Backend Health" button
   - This should **work** and display backend health information

## Alternative Deployment Methods

### Using Azure Portal

1. **Create Resources**:

   - Navigate to Azure Portal
   - Create Virtual Network with two subnets
   - Create two App Service Plans (Standard tier or higher)
   - Create two Web Apps

2. **Configure VNet Integration**:

   - In each Web App → Networking → VNet integration
   - Add VNet integration to respective subnets

3. **Set Access Restrictions**:

   - Backend App → Networking → Access restrictions
   - Add rule to deny all traffic (0.0.0.0/0)
   - Add rule to allow traffic from frontend subnet (higher priority)

4. **Deploy Code**:
   - Use VS Code Azure extension
   - Use GitHub Actions
   - Use Azure DevOps pipelines

### Using Terraform

Create `main.tf`:

```hcl
# Configure Terraform and Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-fullstack-app"
  location = "East US"
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-fullstack"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Subnets
resource "azurerm_subnet" "frontend" {
  name                 = "subnet-frontend"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "backend" {
  name                 = "subnet-backend"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# App Service Plans
resource "azurerm_service_plan" "backend" {
  name                = "plan-backend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "S1"
}

resource "azurerm_service_plan" "frontend" {
  name                = "plan-frontend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "S1"
}

# Backend Web App
resource "azurerm_linux_web_app" "backend" {
  name                = "app-backend-${random_string.unique.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.backend.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
  }

  app_settings = {
    "NODE_ENV"     = "production"
    "FRONTEND_URL" = "https://${azurerm_linux_web_app.frontend.default_hostname}"
  }
}

# Frontend Web App
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-frontend-${random_string.unique.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.frontend.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
  }

  app_settings = {
    "VITE_BACKEND_URL" = "https://${azurerm_linux_web_app.backend.default_hostname}"
  }
}

# VNet Integrations
resource "azurerm_app_service_virtual_network_swift_connection" "frontend" {
  app_service_id = azurerm_linux_web_app.frontend.id
  subnet_id      = azurerm_subnet.frontend.id
}

resource "azurerm_app_service_virtual_network_swift_connection" "backend" {
  app_service_id = azurerm_linux_web_app.backend.id
  subnet_id      = azurerm_subnet.backend.id
}

# Backend Access Restrictions
resource "azurerm_web_app_access_restriction" "backend_deny_all" {
  web_app_id = azurerm_linux_web_app.backend.id

  rule {
    name                    = "DenyAll"
    action                  = "Deny"
    priority                = 100
    ip_address              = "0.0.0.0/0"
    description             = "Deny all external access"
  }

  rule {
    name                    = "AllowFrontendSubnet"
    action                  = "Allow"
    priority                = 90
    virtual_network_subnet_id = azurerm_subnet.frontend.id
    description             = "Allow access from frontend subnet"
  }
}

resource "random_string" "unique" {
  length  = 8
  special = false
  upper   = false
}

# Outputs
output "frontend_url" {
  value = "https://${azurerm_linux_web_app.frontend.default_hostname}"
}

output "backend_url" {
  value = "https://${azurerm_linux_web_app.backend.default_hostname}"
}
```

Deploy with:

```bash
terraform init
terraform plan
terraform apply
```

## Security Features Explained

### 1. Virtual Network Integration

- Both apps are placed in separate subnets within the same VNet
- Apps can communicate privately using internal IP addresses
- Traffic doesn't leave Azure's network backbone

### 2. Access Restrictions

- Backend denies all external traffic (0.0.0.0/0)
- Backend allows traffic only from frontend subnet
- Rules are evaluated by priority (lower number = higher priority)

### 3. Network Security Group (Optional)

For additional security, you can create NSG rules:

```bash
# Create Network Security Group
az network nsg create \
  --resource-group myResourceGroup \
  --name backend-nsg

# Allow traffic from frontend subnet only
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name backend-nsg \
  --name AllowFrontendSubnet \
  --priority 100 \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 80 443 \
  --access Allow \
  --protocol Tcp

# Associate NSG with backend subnet
az network vnet subnet update \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name backend-subnet \
  --network-security-group backend-nsg
```

## Monitoring and Troubleshooting

### 1. View Access Restriction Logs

```bash
# Stream backend app logs
az webapp log tail \
  --resource-group myResourceGroup \
  --name your-unique-backend-name

# Download logs
az webapp log download \
  --resource-group myResourceGroup \
  --name your-unique-backend-name
```

### 2. Test VNet Integration

```bash
# SSH into frontend app and test backend connectivity
az webapp ssh \
  --resource-group myResourceGroup \
  --name your-unique-frontend-name

# Inside the SSH session, test internal connectivity
curl http://your-unique-backend-name.azurewebsites.net/api/health
```

### 3. Common Issues

**Issue**: Backend returns 403 Forbidden

- **Solution**: Check access restriction rules priority and subnet configuration

**Issue**: Frontend can't connect to backend

- **Solution**: Verify VNet integration is active and environment variables are set

**Issue**: VNet integration fails

- **Solution**: Ensure App Service Plan is Standard tier or higher

## Costs Consideration

- **App Service Plans**: ~$56/month each (S1 Standard tier)
- **Virtual Network**: Free (basic usage)
- **Data Transfer**: Minimal cost for internal traffic

## Best Practices

1. **Use Private Endpoints**: For production, consider Private Endpoints instead of access restrictions
2. **Implement Application Gateway**: Add WAF protection for frontend
3. **Use Key Vault**: Store connection strings and secrets securely
4. **Enable Diagnostics**: Configure Application Insights for monitoring
5. **Automate Deployment**: Use CI/CD pipelines for consistent deployments

## Clean Up Resources

To avoid ongoing charges, delete the resource group when done:

```bash
az group delete --name myResourceGroup --yes --no-wait
```

This will delete all resources created in this tutorial.
