#!/bin/bash

# Script para obtener outputs de Cognito y generar archivo .env
# Uso: ./get-cognito-outputs.sh <stack-name>

STACK_NAME=${1:-"cognito-sam"}

echo "Obteniendo outputs del stack: $STACK_NAME"

# Verificar que el stack existe
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" > /dev/null 2>&1; then
    echo "Error: El stack '$STACK_NAME' no existe o no tienes permisos para accederlo"
    exit 1
fi

# Obtener outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

USER_POOL_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
    --output text)

HOSTED_UI_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`HostedUIURL`].OutputValue' \
    --output text)

# Obtener región
AWS_REGION=$(aws configure get region)

# Generar archivo .env
cat > .env << EOF
# AWS Cognito Configuration - Generated from CloudFormation outputs
# Stack: $STACK_NAME
# Generated on: $(date)

VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_COGNITO_DOMAIN=$USER_POOL_DOMAIN.auth.$AWS_REGION.amazoncognito.com
VITE_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
VITE_REDIRECT_SIGN_OUT=http://localhost:3000/
VITE_OAUTH_SCOPES=openid
VITE_RESPONSE_TYPE=code
EOF

echo "✅ Archivo .env generado exitosamente!"
echo ""
echo "Valores obtenidos:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "  User Pool Domain: $USER_POOL_DOMAIN"
echo "  Hosted UI URL: $HOSTED_UI_URL"
echo ""
echo "Archivo .env creado en: $(pwd)/.env"
