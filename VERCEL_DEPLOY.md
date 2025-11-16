# Deploying SmartSchedule to Vercel

## Prerequisites
1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed globally: `npm install -g vercel`
3. Git repository initialized

## Environment Variables
Before deploying, you need to set these environment variables in Vercel:

1. `GEMINI_API_KEY` - Your Google Gemini API key
2. `MONGO_URI` - Your MongoDB connection string
3. `PORT` - Optional (Vercel handles this automatically)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project root**:
   ```bash
   cd c:\Users\Roha\Desktop\smart\SmartSchedule
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N` (for first time)
   - Project name? `smartschedule` (or your choice)
   - In which directory is your code located? `./`
   - Want to override settings? `N`

5. **Set environment variables**:
   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add MONGO_URI
   ```
   Paste your values when prompted. Choose "Production" for both.

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository (GitHub/GitLab/Bitbucket)
4. Configure:
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
5. Add Environment Variables:
   - `GEMINI_API_KEY`: [your key]
   - `MONGO_URI`: [your MongoDB URI]
6. Click "Deploy"

## Post-Deployment

### Update API URLs in Frontend
The app automatically detects if it's running on localhost or production and adjusts the API URL accordingly:
- Local: `http://localhost:4000/api`
- Production: `/api` (relative path)

### Test Your Deployment
1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Test login/registration
3. Check browser console for any errors
4. Verify database connections

### Continuous Deployment
Once set up, every push to your main branch will automatically deploy to Vercel.

## Troubleshooting

### Database Connection Issues
- Ensure your MongoDB Atlas allows connections from all IPs (0.0.0.0/0) or add Vercel's IPs
- Check environment variables are correctly set

### Build Errors
- Check Vercel deployment logs in the dashboard
- Ensure all dependencies are in `package.json`
- TypeScript files are compiled automatically by Vercel

### API Not Working
- Check that routes in `vercel.json` are correct
- Verify `/api` prefix is used in all frontend API calls
- Check Vercel function logs for errors

## Files Created for Deployment

1. **vercel.json** - Vercel configuration
2. **.vercelignore** - Files to exclude from deployment
3. **api/index.ts** - Serverless function handler
4. **backend/src/app.ts** - Modified to export app for serverless

## Local Development
Your local development continues to work as before:
```bash
npm run dev     # Development with auto-reload
npm run build   # Build TypeScript
npm start       # Start production server locally
```

## Vercel Dashboard URLs
- Production: https://your-project.vercel.app
- Dashboard: https://vercel.com/your-username/your-project
- Logs: https://vercel.com/your-username/your-project/logs
