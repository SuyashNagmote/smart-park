# Deployment Guide

This guide covers deploying Smart Park to Vercel and other platforms.

## Vercel Deployment (Recommended for Demo)

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SuyashNagmote/smart-park)

### Manual Deployment

1. **Push to GitHub** (already done)
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository: `SuyashNagmote/smart-park`

3. **Configure Environment Variables** (Optional)
   
   All variables have sensible defaults, but you can customize:
   
   - `OVERPASS_URL` - Overpass API endpoint (default: `https://overpass-api.de/api/interpreter`)
   - `PUNE_CENTER_LAT` - City center latitude (default: `18.5204`)
   - `PUNE_CENTER_LON` - City center longitude (default: `73.8567`)
   - `SEARCH_RADIUS_M` - Search radius in meters (default: `15000`)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Important Notes for Vercel

- **Database**: Uses in-memory SQLite (data resets on each deployment)
- **Sessions**: User sessions will be lost on redeployment
- **Best for**: Demos, testing, and showcasing the UI/UX
- **Not recommended for**: Production use with real users (use Railway or similar for persistent data)

### Vercel Build Configuration

The project is already configured with:
- `@sveltejs/adapter-vercel` - Optimized for Vercel's serverless functions
- `vercel.json` - Build and deployment settings
- Node.js 20.x runtime

## Railway Deployment (Recommended for Production)

Railway provides persistent storage for the SQLite database.

### Steps

1. **Switch to Node Adapter**
   
   Edit `svelte.config.js`:
   ```js
   import adapter from '@sveltejs/adapter-node';
   
   const config = {
     kit: {
       adapter: adapter()
     }
   };
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Node.js app

3. **Configure Environment Variables**
   
   Same as Vercel (all optional with defaults)

4. **Set Start Command**
   
   Railway should auto-detect, but if needed:
   ```
   npm run start
   ```

5. **Deploy**
   - Railway will build and deploy automatically
   - Database persists in the `data/` directory

### Railway Benefits

- ✅ Persistent SQLite database
- ✅ User sessions survive redeployments
- ✅ Suitable for production use
- ✅ Automatic HTTPS
- ✅ Custom domains

## Other Platforms

### Netlify

Similar to Vercel:
1. Install `@sveltejs/adapter-netlify`
2. Update `svelte.config.js`
3. Deploy via Netlify dashboard

### Render

Similar to Railway:
1. Use `@sveltejs/adapter-node`
2. Deploy as a Node.js web service
3. Persistent disk storage available

### Docker

Build and run with Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]
```

## Post-Deployment Checklist

- [ ] Test user signup and login
- [ ] Verify map loads correctly
- [ ] Check live updates stream (SSE)
- [ ] Test booking flow
- [ ] Verify gamification features (XP, quests)
- [ ] Test on mobile devices
- [ ] Check PWA installation

## Troubleshooting

### Build Fails on Windows

The Vercel adapter may fail on Windows due to symlink permissions. This is expected and won't affect deployment on Vercel's servers (Linux).

**Solution**: The build will work fine when deployed to Vercel. For local testing, use:
```bash
npm run dev
```

### Database Issues on Vercel

If you see database-related errors on Vercel, this is expected behavior. Vercel uses in-memory SQLite which resets on each deployment.

**Solution**: For persistent data, deploy to Railway or another platform with persistent storage.

### Map Not Loading

Check browser console for errors. Common issues:
- Leaflet CSS not loading
- CORS issues with tile servers
- JavaScript errors in map initialization

**Solution**: The map should work out of the box. If issues persist, check the browser console for specific errors.

## Performance Optimization

### Vercel

- Automatic edge caching
- Serverless functions for API routes
- CDN for static assets

### Railway

- Single region deployment
- Persistent connections
- Full Node.js server

## Monitoring

### Vercel

- Built-in analytics
- Function logs in dashboard
- Real-time deployment status

### Railway

- Application logs
- Resource usage metrics
- Deployment history

## Cost Estimates

### Vercel (Free Tier)

- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless function executions
- ⚠️ No persistent storage

### Railway (Free Tier)

- ✅ $5 free credit/month
- ✅ Persistent storage
- ✅ Full Node.js server
- ⚠️ May need paid plan for production

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database**: Use proper authentication in production
3. **HTTPS**: Enabled by default on both platforms
4. **CORS**: Configure appropriately for your domain
5. **Rate Limiting**: Consider adding for production

## Support

For deployment issues:
- Check platform documentation (Vercel/Railway)
- Review build logs
- Test locally first with `npm run build && npm run preview`
- Open an issue on GitHub if problems persist
