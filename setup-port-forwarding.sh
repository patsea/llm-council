#!/bin/bash
# One-time setup: Forward port 80 -> 5173 for llm-council.local
# This persists across reboots via a LaunchDaemon

set -e

PLIST="/Library/LaunchDaemons/com.llmcouncil.portforward.plist"

echo "🔧 Setting up port forwarding for llm-council.local"
echo ""
echo "This will:"
echo "  1. Add llm-council.local to /etc/hosts"
echo "  2. Create a port forward: 80 → 5173"
echo "  3. Configure auto-start on boot"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Add hosts entry
echo ""
echo "Step 1: Adding hosts entry..."
if grep -q "llm-council.local" /etc/hosts 2>/dev/null; then
    echo "  ✓ Already exists in /etc/hosts"
else
    echo "127.0.0.1 llm-council.local" | sudo tee -a /etc/hosts
    echo "  ✓ Added to /etc/hosts"
fi

# Step 2: Create LaunchDaemon for port forwarding
echo ""
echo "Step 2: Creating port forwarding service..."
sudo tee "$PLIST" > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.llmcouncil.portforward</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>echo "rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80 -> 127.0.0.1 port 5173" | pfctl -ef -</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
EOF

sudo chown root:wheel "$PLIST"
sudo chmod 644 "$PLIST"
echo "  ✓ LaunchDaemon created"

# Step 3: Enable pfctl if not already enabled
echo ""
echo "Step 3: Enabling port forwarding..."
sudo pfctl -e 2>/dev/null || true
echo "rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80 -> 127.0.0.1 port 5173" | sudo pfctl -f - 2>/dev/null || true
echo "  ✓ Port forwarding active"

# Step 4: Load the LaunchDaemon
echo ""
echo "Step 4: Setting up auto-start..."
sudo launchctl unload "$PLIST" 2>/dev/null || true
sudo launchctl load -w "$PLIST"
echo "  ✓ Will auto-start on boot"

echo ""
echo "✅ Setup complete!"
echo ""
echo "You can now access http://llm-council.local/ (no port needed)"
echo "Port forwarding will persist across reboots."
echo ""
echo "To remove this setup later, run:"
echo "  sudo launchctl unload -w $PLIST"
echo "  sudo rm $PLIST"
echo ""
