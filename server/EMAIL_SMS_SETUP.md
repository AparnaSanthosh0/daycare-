# TinyTots Email & SMS Setup Guide

## Email Service Setup

### Option 1: SendGrid (Recommended)

1. **Create SendGrid Account**
   - Go to [SendGrid](https://sendgrid.com)
   - Sign up for a free account (100 emails/day)
   - Verify your email address

2. **Get API Key**
   - Go to Settings > API Keys
   - Create a new API Key with "Mail Send" permissions
   - Copy the API key

3. **Configure Environment Variables**
   ```bash
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your_sendgrid_api_key_here
   EMAIL_FROM=TinyTots <noreply@yourdomain.com>
   ```

4. **Verify Sender Identity**
   - In SendGrid dashboard, go to Settings > Sender Authentication
   - Authenticate your domain or verify your email address
   - For domain authentication, add the required DNS records

### Option 2: AWS SES (Amazon Simple Email Service)

1. **Create AWS Account & Setup SES**
   - Go to [AWS Console](https://console.aws.amazon.com)
   - Navigate to SES (Simple Email Service)
   - Verify your domain or email address

2. **Generate SMTP Credentials**
   - In SES Console, go to SMTP Settings
   - Create SMTP credentials (username and password)

3. **Configure Environment Variables**
   ```bash
   EMAIL_HOST=email-smtp.us-east-1.amazonaws.com  # Change region if needed
   EMAIL_PORT=587
   EMAIL_USER=your_ses_smtp_username
   EMAIL_PASS=your_ses_smtp_password
   EMAIL_FROM=TinyTots <noreply@yourdomain.com>
   ```

### Option 3: Gmail (Development Only)

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**
   - Go to Google Account > Security > App passwords
   - Generate a new app password for "Mail"

3. **Configure Environment Variables**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

## SMS Service Setup (Twilio)

### Step 1: Create Twilio Account
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free account
3. Complete phone number verification

### Step 2: Get Account Credentials
1. In Twilio Console, go to Dashboard
2. Copy your **Account SID** and **Auth Token**
3. Go to Phone Numbers > Manage
4. Buy or select a phone number for SMS

### Step 3: Configure Environment Variables
```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_SMS_FROM=+1234567890  # Your Twilio phone number
```

### Step 4: Update Phone Numbers (Optional)
If you want to send SMS to Indian numbers, ensure they're in international format:
- Indian number: `+919876543210`
- US number: `+15551234567`

## Environment Variables Setup

1. **Copy the example file**
   ```bash
   cp .env.example .env
   ```

2. **Update the .env file** with your actual credentials:
   - Replace all placeholder values with real credentials
   - Ensure EMAIL_FROM matches your verified sender identity

3. **Test the configuration**
   ```bash
   npm run dev
   ```

## Testing Email & SMS

### Test Email
1. Register a new customer through the frontend
2. Check if you receive the OTP email
3. Verify the email preview URLs work (in development)

### Test SMS
1. Register with a phone number
2. Check console logs for SMS content (in development)
3. In production, verify SMS delivery in Twilio Console

## Troubleshooting

### Email Issues
- **Authentication Failed**: Check credentials and port settings
- **Sender Identity**: Ensure your FROM email is verified
- **Rate Limits**: SendGrid free tier has 100 emails/day limit
- **Domain Authentication**: For better deliverability, authenticate your domain

### SMS Issues
- **Invalid Number**: Ensure phone numbers are in international format
- **Geographic Restrictions**: Some countries have SMS restrictions
- **Twilio Trial**: Trial accounts can only send to verified numbers

### Common Issues
- **Environment Variables**: Ensure all required variables are set
- **Network**: Check firewall settings for SMTP ports (587, 465)
- **Dependencies**: Run `npm install` if packages are missing

## Production Deployment

1. **Use Production Email Service**: Avoid Gmail in production
2. **Domain Authentication**: Set up SPF, DKIM, DMARC records
3. **Monitor Deliverability**: Use email service dashboards
4. **Rate Limiting**: Consider implementing rate limits for SMS
5. **Error Handling**: Monitor logs for failed deliveries

## Security Best Practices

1. **Environment Variables**: Never commit .env files to version control
2. **API Keys**: Rotate credentials regularly
3. **Rate Limiting**: Implement rate limits to prevent abuse
4. **Monitoring**: Set up alerts for service failures
5. **HTTPS**: Always use HTTPS in production
