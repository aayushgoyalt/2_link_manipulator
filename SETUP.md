# Camera OCR Setup Guide

## Quick Start

To use the Camera OCR feature, you need to configure a Google Gemini API key.

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (starts with `AIza...`)

### Step 2: Configure the Application

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your API key:
   ```
   GEMINI_API_KEY=AIzaSyYourActualAPIKeyHere
   ```

3. Save the file

### Step 3: Rebuild and Run

```bash
npm run build
npm run dev
```

## Troubleshooting

### "LLM API key not configured" Error

**Problem:** The application can't find your API key.

**Solutions:**
1. Make sure you created the `.env` file in the project root (same folder as `package.json`)
2. Check that the API key is on a line starting with `GEMINI_API_KEY=`
3. Make sure there are no spaces around the `=` sign
4. Rebuild the application after adding the key: `npm run build`

### "Invalid mathematical expression" with Long String

**Problem:** The LLM returned image data instead of a math expression.

**Solutions:**
1. This usually means the API key is missing or invalid
2. Verify your API key is correct (should start with `AIza`)
3. Check that you have API quota remaining in Google AI Studio
4. Try capturing a clearer image with better lighting

### Camera Permission Denied

**macOS:**
1. Open System Preferences > Security & Privacy > Camera
2. Enable camera access for your application

**Windows:**
1. Open Settings > Privacy > Camera
2. Enable camera access for apps

## Testing Without Camera OCR

If you don't want to use the Camera OCR feature, you can still use the calculator normally by:
- Clicking the number and operator buttons
- Using your keyboard to type expressions
- The camera button will show an error if clicked without an API key configured

## API Key Security

⚠️ **Important:** Never commit your `.env` file to version control!

The `.env` file is already in `.gitignore` to prevent accidental commits.
