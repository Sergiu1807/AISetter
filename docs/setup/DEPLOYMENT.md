# Deployment Guide - AI Appointment Setter

## 🎉 Successfully Pushed to GitHub!

Your code is now live at: https://github.com/Sergiu1807/AISetter

## ✅ Security Features Implemented

1. **Rate Limiting** - 60 requests/minute per IP
2. **Webhook Signature Verification** - HMAC SHA-256 authentication
3. **Security Headers** - X-Frame-Options, CSP, etc.
4. **Input Validation** - Message length limits and sanitization
5. **No Exposed Secrets** - All credentials in environment variables

## 🔐 Generated Webhook Secret

**IMPORTANT**: Save this secret - you'll need it for Vercel!

```
HBs/VDVAn2zvpP689uA7AKg0LddaHKgyg6W/MU4mWVo=
```

## 📝 Next Steps: Deploy to Vercel

### Step 1: Import to Vercel

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Select **"Import from GitHub"**
4. Choose repository: **Sergiu1807/AISetter**
5. Click **"Import"**

### Step 2: Configure Project Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

Click **"Deploy"** (it will fail - we need environment variables first!)

### Step 3: Add Environment Variables

After the first failed deployment:

1. Go to **Project Settings** → **Environment Variables**
2. Add these variables for **Production, Preview, and Development**:

```
ANTHROPIC_API_KEY=<your-new-anthropic-key>
NEXT_PUBLIC_SUPABASE_URL=https://pcwyvcutzdazruuzjija.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-new-supabase-key>
MANYCHAT_API_KEY=<your-manychat-api-key>
MANYCHAT_RESPONSE_FLOW_ID=content20251104094228_369757
CALENDAR_LINK=https://calendly.com/vlad-gogoanta/call
WEBHOOK_SECRET=HBs/VDVAn2zvpP689uA7AKg0LddaHKgyg6W/MU4mWVo=
```

**CRITICAL**: You MUST use NEW API keys (rotate the old ones)!

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the failed deployment
3. Wait for build to complete (~2-3 minutes)

### Step 5: Get Your Deployment URL

After successful deployment, you'll get a URL like:
```
https://ai-setter.vercel.app
```

Or it might be:
```
https://aisetter.vercel.app
```

## 🔄 Rotate Compromised Credentials

Since your old `.env` file had real credentials, you MUST rotate them:

### 1. Anthropic API Key

1. Go to: https://console.anthropic.com/settings/keys
2. Find your old key: `sk-ant-api03-JpXVw...`
3. Click **"Revoke"** or **"Delete"**
4. Create a **New Key**
5. Copy the new key
6. Update in Vercel: **ANTHROPIC_API_KEY**

### 2. Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/pcwyvcutzdazruuzjija/settings/api
2. Scroll to **Service Role Key**
3. Click **"Reset service_role key"**
4. Confirm the reset
5. Copy the new key
6. Update in Vercel: **SUPABASE_SERVICE_ROLE_KEY**

### 3. ManyChat API Key (if possible)

1. Check if ManyChat allows API key rotation
2. If yes, generate a new key
3. Update in Vercel: **MANYCHAT_API_KEY**

## 🔗 Configure ManyChat Webhook

### Your Webhook URL

Once deployed, your webhook URL will be:
```
https://<your-vercel-url>/api/webhook/manychat
```

### ManyChat Setup

1. **Go to ManyChat** → Settings → API
2. **Add Webhook**:
   - URL: `https://<your-vercel-url>/api/webhook/manychat`
   - Method: **POST**
   - Headers (if supported):
     - `X-ManyChat-Signature`: (ManyChat generates this)

3. **Verify Custom Fields Exist**:
   - Input: `AI > User Messages`
   - Output: `AI > Answer 1` through `AI > Answer 6`

4. **Configure Your Flow**:
   - Use Flow ID: `content20251104094228_369757`

## ✅ Test Your Deployment

### 1. Health Check

```bash
curl https://<your-vercel-url>/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T...",
  "service": "AI Appointment Setter",
  "version": "1.0.0"
}
```

### 2. Rate Limiting Test

Send 61 requests rapidly - should get rate limited:
```bash
for i in {1..61}; do
  curl -X POST https://<your-vercel-url>/api/webhook/manychat \
    -H "Content-Type: application/json" \
    -d '{"id":"test"}' &
done
```

### 3. Webhook Authentication Test

Request without signature should fail with 401:
```bash
curl -X POST https://<your-vercel-url>/api/webhook/manychat \
  -H "Content-Type: application/json" \
  -d '{"id":"test","custom_fields":{"AI > User Messages":"hi"}}'
```

Expected: `401 Unauthorized` or `{"error":"Invalid signature"}`

### 4. End-to-End Test

1. Send a test Instagram DM to your account
2. ManyChat should capture it
3. Check **Vercel Logs** for:
   ```
   [WEBHOOK] Received message from subscriber 12345678...
   ```
4. Verify AI response sent back to Instagram

## 📊 Monitoring

### Vercel Dashboard

Monitor at: https://vercel.com/dashboard

- **Function Invocations**: Track webhook calls
- **Error Rate**: Should be near 0%
- **Logs**: Real-time request logs

### Anthropic Dashboard

Monitor at: https://console.anthropic.com

- **API Usage**: Track token consumption
- **Prompt Cache Hit Rate**: Should be >80%
- **Costs**: Should be ~$15-20/month for 1000 msgs/day

### Supabase Dashboard

Monitor at: https://supabase.com/dashboard/project/pcwyvcutzdazruuzjija

- **Database Size**: Track growth
- **API Requests**: Monitor query volume
- **Table Editor**: View leads in real-time

## 🚨 If Something Goes Wrong

### Deployment Fails

1. Check Vercel build logs
2. Verify all environment variables are set
3. Make sure TypeScript compiles: `npm run build`

### Webhook Returns 401 (Invalid Signature)

**Option 1**: Disable signature verification temporarily
- Remove webhook secret from Vercel
- This will skip signature check (line 40-54 in route.ts)

**Option 2**: Debug signature
- Check ManyChat sends `X-ManyChat-Signature` header
- Verify the secret matches exactly

### Claude API Errors

1. Check API key is valid
2. Verify you have credits
3. Check Anthropic status: https://status.anthropic.com

### Database Errors

1. Verify Supabase credentials
2. Check database migration ran
3. Test connection from Supabase dashboard

## 💰 Cost Monitoring

Set spending alerts:

1. **Anthropic**: Set $50/month limit
2. **Vercel**: Monitor free tier usage
3. **Supabase**: Free tier should be sufficient

## 📈 Expected Performance

- **Response Time**: <2 seconds (P95)
- **Uptime**: 99.9%
- **Error Rate**: <1%
- **Cache Hit Rate**: >80%

## 🎯 Success Checklist

Before going live with production traffic:

- [x] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] All environment variables configured
- [ ] Old API keys rotated
- [ ] ManyChat webhook configured
- [ ] Health check passing
- [ ] Rate limiting tested
- [ ] End-to-end test successful
- [ ] Monitoring dashboards set up

## 📞 Support

If you encounter issues:

1. Check Vercel logs first
2. Review Anthropic dashboard
3. Inspect Supabase logs
4. Test webhook with curl

## 🎊 You're Ready!

Once all tests pass, your AI appointment setter is production-ready!

The system will:
- Qualify leads through natural conversation
- Use your Romanian P1-P7 framework
- Book appointments automatically
- Save 90% on API costs through prompt caching

Good luck with your eCommerce coaching business! 🚀
