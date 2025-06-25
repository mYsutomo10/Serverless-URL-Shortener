#!/bin/bash

# AWS URL Shortener Deployment Script
# This script deploys the URL shortener using AWS SAM

set -e

# Configuration
STACK_NAME="url-shortener"
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
S3_BUCKET_PREFIX="url-shortener-deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        log_info "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
}

# Check if SAM CLI is installed
check_sam_cli() {
    if ! command -v sam &> /dev/null; then
        log_error "SAM CLI is not installed. Please install it first."
        log_info "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
        exit 1
    fi
}

# Check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local current_region=$(aws configure get region)
    
    log_info "AWS Account ID: $account_id"
    log_info "AWS Region: $current_region"
    
    if [ "$current_region" != "$AWS_REGION" ]; then
        log_warning "Current AWS region ($current_region) differs from deployment region ($AWS_REGION)"
        read -p "Continue with region $AWS_REGION? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Create S3 bucket for deployment artifacts
create_deployment_bucket() {
    local bucket_name="${S3_BUCKET_PREFIX}-$(aws sts get-caller-identity --query Account --output text)-${AWS_REGION}"
    
    log_info "Creating S3 bucket for deployment artifacts: $bucket_name"
    
    if aws s3 ls "s3://$bucket_name" 2>&1 | grep -q 'NoSuchBucket'; then
        if [ "$AWS_REGION" == "us-east-1" ]; then
            aws s3 mb "s3://$bucket_name" --region "$AWS_REGION"
        else
            aws s3 mb "s3://$bucket_name" --region "$AWS_REGION" --create-bucket-configuration LocationConstraint="$AWS_REGION"
        fi
        log_success "Created S3 bucket: $bucket_name"
    else
        log_info "S3 bucket already exists: $bucket_name"
    fi
    
    echo "$bucket_name"
}

# Install Lambda dependencies
install_dependencies() {
    log_info "Installing Lambda dependencies..."
    
    if [ -d "lambda" ]; then
        cd lambda
        npm install --production
        cd ..
        log_success "Lambda dependencies installed"
    else
        log_error "Lambda directory not found"
        exit 1
    fi
}

# Build and deploy with SAM
deploy_sam() {
    local bucket_name=$1
    
    log_info "Building SAM application..."
    sam build
    
    log_info "Deploying to AWS..."
    sam deploy \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --s3-bucket "$bucket_name" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
        --no-confirm-changeset
    
    log_success "Deployment completed successfully!"
}

# Get stack outputs
get_outputs() {
    log_info "Retrieving stack outputs..."
    
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text 2>/dev/null || echo "N/A")
    
    local frontend_url=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
        --output text 2>/dev/null || echo "N/A")
    
    local dashboard_url=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
        --output text 2>/dev/null || echo "N/A")
    
    echo
    log_success "🎉 Deployment Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}API Endpoint:${NC}      $api_endpoint"
    echo -e "${GREEN}Frontend URL:${NC}      $frontend_url"
    echo -e "${GREEN}CloudWatch Dashboard:${NC} $dashboard_url"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    log_info "Test your API:"
    echo "curl -X POST $api_endpoint/shorten \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"longUrl\": \"https://example.com\"}'"
    echo
}

# Deploy frontend to S3
deploy_frontend() {
    log_info "Building and deploying frontend..."
    
    # Build the React app
    npm run build
    
    # Get the S3 bucket name from CloudFormation outputs
    local bucket_name=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$bucket_name" ] && [ "$bucket_name" != "None" ]; then
        log_info "Uploading frontend to S3 bucket: $bucket_name"
        aws s3 sync dist/ "s3://$bucket_name" --delete
        log_success "Frontend deployed to S3"
    else
        log_warning "Frontend S3 bucket not found in stack outputs"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf .aws-sam/
}

# Main deployment function
main() {
    log_info "🚀 Starting AWS URL Shortener deployment..."
    echo
    
    # Pre-deployment checks
    check_aws_cli
    check_sam_cli
    check_aws_credentials
    
    # Create deployment bucket
    DEPLOYMENT_BUCKET=$(create_deployment_bucket)
    
    # Install dependencies and deploy
    install_dependencies
    deploy_sam "$DEPLOYMENT_BUCKET"
    
    # Deploy frontend (optional)
    if [ -f "package.json" ]; then
        deploy_frontend
    fi
    
    # Show results
    get_outputs
    
    # Cleanup
    trap cleanup EXIT
    
    log_success "🎉 All done! Your URL shortener is live!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment    Environment name (default: dev)"
            echo "  -r, --region         AWS region (default: us-east-1)"
            echo "  -s, --stack-name     CloudFormation stack name (default: url-shortener)"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main