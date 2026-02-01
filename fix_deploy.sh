#!/bin/bash

# Idea Holiday Tour Maker - Firebase Configuration Repair
# This script forces the creation of firebase.json and .firebaserc

echo "🔧 Starting Repair for Idea Holiday Tour Maker..."

# 1. Create firebase.json
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
echo "✅ Created firebase.json"

# 2. Create .firebaserc
cat > .firebaserc <<EOF
{
  "projects": {
    "default": "ideaholidaytourmaker"
  }
}
EOF
echo "✅ Created .firebaserc"

# 3. Verify Functions Directory
if [ -d "functions" ]; then
    echo "✅ Functions directory detected."
else
    echo "⚠️ Functions directory missing! Please check project structure."
fi

echo "🎉 Configuration Restored. You can now run 'firebase deploy --only functions'"
