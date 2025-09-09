# Covenantrix - Contract Intelligence Platform

**Proof of Concept for Electron + Python Distribution Pipeline**

This is a minimal test application to validate the distribution architecture for the full Covenantrix contract intelligence platform. It demonstrates successful packaging and deployment of an Electron frontend with a Python FastAPI backend.

## 🎯 Purpose

This proof-of-concept validates:
- ✅ Electron + Python packaging for Windows, macOS, and Linux
- ✅ Embedded Python distribution with all dependencies
- ✅ Automated CI/CD pipeline with GitHub Actions
- ✅ Cross-platform auto-updater mechanism
- ✅ IPC communication between Electron and Python backend

## 🏗️ Architecture

```
Covenantrix/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge  
├── renderer/            # Frontend UI
│   ├── index.html
│   ├── style.css
│   └── renderer.js
├── backend/             # Python FastAPI backend
│   └── main.py
└── .github/workflows/   # CI/CD pipeline
    └── build.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- Git

### Development Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd covenantrix
npm install
```

2. **Install Python dependencies:**
```bash
cd backend
pip install fastapi uvicorn pydantic
cd ..
```

3. **Run in development mode:**
```bash
npm start
```

The application will:
- Start the Python backend on http://127.0.0.1:8000
- Launch the Electron frontend
- Automatically connect and test the communication

### Testing the Application

1. **Backend Connection**: Click "Test Backend Connection" to verify Python backend
2. **AI Integration**: Enter a test query and click "Send to AI Backend"  
3. **System Info**: View platform and version information
4. **Logs**: Monitor application logs in real-time

## 📦 Building and Distribution

### Local Build
```bash
# Build for current platform
npm run package:win    # Windows
npm run package:mac    # macOS  
npm run package:linux  # Linux

# Build for all platforms (requires platform-specific tools)
npm run package:all
```

### GitHub Actions CI/CD

The automated pipeline builds for all platforms on every tag push:

1. **Create and push a tag:**
```bash
git tag v0.1.0
git push origin v0.1.0
```

2. **Monitor the build:**
- Go to your GitHub repository
- Click "Actions" tab
- Watch the build progress for Windows, macOS, and Linux

3. **Download artifacts:**
- Builds are automatically uploaded as artifacts
- Releases are created automatically for version tags
- Download and test on target platforms

### Manual Trigger
You can also manually trigger builds from GitHub:
1. Go to Actions → "Build and Release Covenantrix"
2. Click "Run workflow"
3. Choose options and run

## 🔧 Configuration

### Electron Builder Settings
Edit `package.json` → `build` section to customize:
- App metadata (name, description, author)
- Platform-specific settings
- Code signing certificates
- Auto-updater configuration
- Publishing settings

### Python Backend Configuration
Modify `backend/main.py` to:
- Add new API endpoints
- Configure different ports
- Add authentication
- Integrate with AI services

## 🧪 Testing the Distribution

### Automated Testing
```bash
# Test backend connectivity
curl http://127.0.0.1:8000/health

# Test AI endpoint
curl -X POST http://127.0.0.1:8000/test-llm \
  -H "Content-Type: application/json" \
  -d '{"query": "test contract analysis"}'
```

### Manual Testing Checklist
- [ ] App launches on fresh system (no dev tools)
- [ ] Python backend starts automatically
- [ ] Frontend connects to backend successfully
- [ ] Health check passes
- [ ] AI test endpoint responds
- [ ] Auto-updater works (if implemented)
- [ ] App gracefully handles backend failures

## 🔍 Troubleshooting

### Common Issues

**"Python executable not found"**
- Check if Python distribution was packaged correctly
- Verify path resolution in `main.js`
- Ensure Python executable has correct permissions

**"Backend connection failed"**
- Check if Python dependencies are installed
- Verify port 8000 is not blocked
- Look for Python errors in console logs

**"Build fails on GitHub Actions"**
- Check Python download URLs are still valid
- Verify all dependencies are listed correctly
- Review build logs for specific error messages

### Debug Mode
Run with debug logging:
```bash
npm run dev
```

This will:
- Show Python stdout/stderr
- Open DevTools automatically
- Enable verbose logging
- Provide debug API in console

## 🚀 Next Steps (Full Platform Development)

This proof-of-concept validates the technical foundation. For the full Covenantrix platform:

### Phase 1: Core Features
- [ ] LightRAG integration for document processing
- [ ] OpenAI/Anthropic API integration
- [ ] Basic contract analysis capabilities
- [ ] User authentication and licensing system

### Phase 2: Advanced Features  
- [ ] Real-time opportunity identification
- [ ] Multi-industry AI personas
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard

### Phase 3: Enterprise Features
- [ ] White-label customization
- [ ] API access for integrations
- [ ] Enterprise security compliance
- [ ] Advanced deployment options

## 📋 Success Criteria

This proof-of-concept is successful when:
- ✅ All platforms build without errors
- ✅ Applications run on fresh systems (no dev dependencies)
- ✅ Python backend starts reliably across platforms
- ✅ Auto-updater mechanism works correctly
- ✅ No critical security vulnerabilities

## 🔒 Security Considerations

- Python backend runs locally (no remote access)
- IPC communication uses secure contextBridge
- No sensitive data stored in local storage
- All external API calls go through backend
- Code signing certificates for production releases

## 📖 Documentation

- **Technical Architecture**: See inline code comments
- **API Documentation**: http://127.0.0.1:8000/docs (when running)
- **Build Process**: `.github/workflows/build.yml`
- **Electron Configuration**: `package.json` → `build` section

## 🤝 Contributing

This is a proof-of-concept repository. For the full platform development:

1. Validate this PoC works on your target platforms
2. Report any distribution issues or improvements
3. Suggest optimizations for the build pipeline
4. Test auto-update mechanisms

## 📄 License

MIT License - See LICENSE file for details

---

**Status**: ✅ Proof of Concept  
**Next**: Full platform development with validated architecture