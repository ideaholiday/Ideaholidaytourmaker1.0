#!/bin/bash

echo "🚀 Starting Full Deployment Repair..."

# 1. Create Configs
cat > firebase.json <<EOF
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"\$RESOURCE_DIR\" run build"
      ]
    }
  ]
}
EOF
echo "✅ Restored firebase.json"

cat > .firebaserc <<EOF
{
  "projects": {
    "default": "ideaholidaytourmaker"
  }
}
EOF
echo "✅ Restored .firebaserc"

# 2. Install Dependencies (Critical Step)
if [ -d "functions" ]; then
    echo "📦 Installing Function Dependencies..."
    cd functions
    npm install
    cd ..
else
    echo "❌ Error: 'functions' directory missing!"
    exit 1
fi

# 3. Deploy
echo "🔥 Deploying to Firebase (this may take a few minutes)..."
firebase deploy --only functions
