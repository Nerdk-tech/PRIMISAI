# WhatsApp AI Integration Setup Guide

This guide will help you set up WhatsApp AI integration for PRIMIS AI.

---

## Overview

Your PRIMIS AI can now respond to WhatsApp messages automatically. Users can message your WhatsApp Business number and get AI-powered responses.

---

## Prerequisites

1. A WhatsApp Business account
2. Meta Business account
3. Admin access to PRIMIS AI (damibotzinc@gmail.com)

---

## Step-by-Step Setup

### 1. Create Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create a new business account (or use existing)
3. Verify your business

### 2. Set Up WhatsApp Business API

1. In Meta Business Suite, go to **WhatsApp** → **API Setup**
2. Create a new WhatsApp Business App
3. Add a phone number to your WhatsApp Business account
4. Verify the phone number with the code sent via SMS

### 3. Get Your Credentials

From the WhatsApp API Setup page, copy:

- **Phone Number ID** (found under "Phone numbers" section)
- **Access Token** (found under "Temporary access token" - later replace with permanent token)

### 4. Configure Webhook in Meta

1. In WhatsApp API Setup, go to **Configuration** → **Webhook**
2. Click "Edit"
3. Enter the following details:

**Callback URL:**
```
https://YOUR-PROJECT-ID.backend.onspace.ai/functions/v1/whatsapp-webhook
```
(Replace YOUR-PROJECT-ID with your actual OnSpace project ID)

**Verify Token:**
```
primis-ai-webhook-verify
```
(Or any custom token you prefer - must match the one you set in secrets)

4. Subscribe to webhook fields:
   - ✅ messages

5. Click "Verify and Save"

### 5. Add Secrets to OnSpace Cloud

1. Go to your OnSpace Cloud Dashboard
2. Navigate to **Cloud** → **Secrets**
3. Add the following secrets:

```
WHATSAPP_TOKEN = your_access_token_from_meta
WHATSAPP_PHONE_ID = your_phone_number_id
WHATSAPP_VERIFY_TOKEN = primis-ai-webhook-verify
```

### 6. Test the Integration

1. Open PRIMIS AI as admin (damibotzinc@gmail.com)
2. Click the PRIMIS logo **7 times** to unlock the admin panel
3. Navigate to the WhatsApp Admin Panel
4. Verify it shows "Connected" status
5. Send a test message to your WhatsApp Business number
6. Check the admin panel to see the message log

---

## Hidden Admin Access

**For Security**: The WhatsApp admin panel is hidden and only accessible to the admin email.

**How to Access:**
1. Login with admin account (damibotzinc@gmail.com)
2. Click the **PRIMIS AI logo** in the sidebar **7 times** rapidly
3. You'll be redirected to `/admin/whatsapp`

---

## Features

✅ **Auto-Response** - AI responds to all WhatsApp messages automatically  
✅ **Message Logging** - All conversations are logged in the admin panel  
✅ **Fallback System** - Uses OpenAI if OnSpace AI balance runs out  
✅ **Group & DM Support** - Works in both group chats and direct messages  
✅ **Real-time Updates** - Admin panel refreshes every 10 seconds  
✅ **Statistics** - View total messages and today's count  

---

## API Fallback System

To fix the "Insufficient balance" error:

1. **Primary**: OnSpace AI (if balance available)
2. **Fallback**: OpenAI GPT-4 (using your OPENAI_API_KEY)
3. **Last Resort**: Error message to user

This ensures your WhatsApp AI **never stops working** even if OnSpace AI balance runs out.

---

## Troubleshooting

### Webhook Verification Failed
- Check that `WHATSAPP_VERIFY_TOKEN` matches the token you entered in Meta
- Ensure the webhook URL is correct with `.backend.onspace.ai`

### Messages Not Showing in Admin Panel
- Verify the Edge Function `whatsapp-webhook` is deployed
- Check OnSpace Cloud → Log for any errors
- Ensure the phone number is verified in Meta

### AI Not Responding
- Check that `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` are correct
- Verify your OpenAI API key has credits (fallback)
- Check webhook subscription includes "messages" field

### Admin Panel Shows "Not Configured"
- Ensure all 3 secrets are added in OnSpace Cloud
- Wait 1-2 minutes for secrets to propagate
- Refresh the admin panel

---

## Security Notes

- Only the admin email (damibotzinc@gmail.com) can access the WhatsApp panel
- The admin panel URL is hidden and requires 7-click activation
- All WhatsApp messages are stored securely with RLS policies
- Access tokens are stored server-side only (never exposed to client)

---

## Upgrading to Permanent Token

The temporary access token from Meta expires after 24 hours. To create a permanent token:

1. Go to [Meta Business Settings](https://business.facebook.com/settings/)
2. Navigate to **System Users**
3. Create a new system user
4. Assign the WhatsApp app to the system user
5. Generate a permanent token with `whatsapp_business_messaging` permission
6. Update `WHATSAPP_TOKEN` in OnSpace Cloud secrets

---

## Support

For issues or questions, contact: **damibotzinc@gmail.com**

---

**Created by Damini Codesphere Organization**
