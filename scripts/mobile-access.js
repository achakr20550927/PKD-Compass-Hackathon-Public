const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Mobile Access Script (v7)
 * Proactively helps the user connect via Local IP or Tunnel.
 */

function getAllLocalIps() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ address: iface.address, name: name });
            }
        }
    }
    return ips;
}

(async () => {
    const port = 3000;
    const allIps = getAllLocalIps();

    // Look for common WiFi/Home network ranges (10.0.x.x, 192.168.x.x)
    // Avoid virtual IPs like WSL/VPN if possible
    const bestIp = allIps.find(ip => {
        return (ip.address.startsWith('192.168.') || ip.address.startsWith('10.0.')) &&
            !ip.name.toLowerCase().includes('vbox') &&
            !ip.name.toLowerCase().includes('vethernet');
    }) || allIps[0];

    const localUrl = `http://${bestIp.address}:${port}`;
    const tunnelConfigPath = path.join(__dirname, '..', 'mobile', 'config.json');

    console.log('\n---------------------------------------------------------');
    console.log('📶 MOBILE ACCESS CONFIGURATION');
    console.log('---------------------------------------------------------');
    console.log('Found these IPs on your computer:');
    allIps.forEach(ip => {
        const marker = ip.address === bestIp.address ? ' ✅ (Recommended)' : '';
        console.log(`- ${ip.address} [${ip.name}]${marker}`);
    });

    console.log(`\n🔗 Selected Local URL: ${localUrl}`);
    console.log('👉 Use this if you are on the same WiFi as your computer.');

    // Update config.json
    try {
        fs.writeFileSync(tunnelConfigPath, JSON.stringify({ apiUrl: localUrl }, null, 2));
        console.log('✅ mobile/config.json updated to Local IP.');
    } catch (err) {
        console.error('❌ Failed to update config.json:', err.message);
    }

    console.log('\n🌍 ACTIVATING GLOBAL MODE (TUNNEL)...');
    console.log('This will make the app work for anyone, anywhere in the world.');
    console.log('---------------------------------------------------------\n');

    console.log(`🚀 Starting tunnel on port ${port} using Pinggy...`);

    const envPath = path.join(__dirname, '..', '.env');

    const ssh = spawn('ssh', [
        '-p', '443',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ExitOnForwardFailure=yes',
        '-R', `0:localhost:${port}`,
        'a.pinggy.io'
    ]);

    let capturedUrl = null;

    const handleOutput = (data) => {
        const output = data.toString();
        process.stdout.write(output);

        // Pinggy URL pattern: https://xxxx.a.pinggy.io
        // Serveo URL pattern: https://xxxx.serveo.net
        const match = output.match(/https?:\/\/[a-z0-9-.]+\.(pinggy\.io|serveo\.net|serveousercontent\.com)/i);

        if (match && !capturedUrl) {
            capturedUrl = match[0];
            console.log('\n' + '='.repeat(60));
            console.log('⚡ STITCH GLOBAL MODE ACTIVATED');
            console.log('='.repeat(60));
            console.log(`🔗 Public URL: ${capturedUrl}`);
            console.log(`🔑 Google Auth Redirect URI:`);
            console.log(`   ${capturedUrl}/api/auth/callback/google`);
            console.log('='.repeat(60));

            // 1. Update Mobile App Config
            try {
                fs.writeFileSync(tunnelConfigPath, JSON.stringify({ apiUrl: capturedUrl }, null, 2));
                console.log('✅ Mobile App: config.json updated.');
            } catch (err) { console.error('❌ Mobile Config Fail:', err.message); }

            // 2. Update Backend .env (for Google Auth Redirects)
            try {
                let envContent = fs.readFileSync(envPath, 'utf8');
                if (envContent.includes('NEXTAUTH_URL=')) {
                    envContent = envContent.replace(/NEXTAUTH_URL="[^"]*"/, `NEXTAUTH_URL="${capturedUrl}"`);
                    envContent = envContent.replace(/NEXTAUTH_URL=[^\s]+/, `NEXTAUTH_URL="${capturedUrl}"`);
                } else {
                    envContent += `\nNEXTAUTH_URL="${capturedUrl}"`;
                }
                fs.writeFileSync(envPath, envContent);
                console.log('✅ Backend: .env (NEXTAUTH_URL) updated.');
            } catch (err) { console.error('❌ .env Update Fail:', err.message); }

            console.log('\n👉 IMPORTANT GOOGLE SETUP:');
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. Add the Redirect URI above to your OAuth Credentials.');
            console.log('3. Leave "Authorized JavaScript Origins" EMPTY.');
            console.log('\n👉 METRO BUNDLER:');
            console.log('Ensure you ran: npx expo start --clear\n');
            console.log('='.repeat(60) + '\n');
        }
    };

    ssh.stdout.on('data', handleOutput);
    ssh.stderr.on('data', handleOutput);

    ssh.on('close', (code) => {
        console.log(`\n🛑 Tunnel process closed (code ${code}).`);
        process.exit();
    });

    process.on('SIGINT', () => {
        ssh.kill();
        process.exit();
    });
})();
