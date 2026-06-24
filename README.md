# Pi Pad

Make your orange pi (or other linux USB gadget device) act as a touchpad + keyboard. Control via other device in a web broswer.

## Setup On Orange Pi

### Step 1: Clone the Repository
```bash
git clone https://github.com/ElenBOT/pi_pad.git
cd pi_pad
```

### Step 2: Install Python Dependencies & Create Virtual Environment
A virtual environment ensures that the Python dependencies are cleanly isolated and accessible to the systemd background service:

```bash
sudo apt update
sudo apt install -y python3-pip python3-dev python3-venv

# Create a virtual environment and install dependencies
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

### Step 3: Register the Auto-Start systemd Service
Instead of copying a file with hardcoded paths, generate the systemd service file dynamically so it automatically uses your current directory and the virtual environment:

```bash
# Dynamically create the service configuration in systemd
sudo bash -c "cat <<EOF > /etc/systemd/system/pi_pad.service
[Unit]
Description=Pi Pad - Web Touchpad Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
ExecStop=$(pwd)/setup_gadget.sh --clean
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

# Reload systemd, enable auto-start on boot, and start the service now
sudo systemctl daemon-reload
sudo systemctl enable pi_pad
sudo systemctl restart pi_pad
```

## Use

Open a web browser on your smartphone or tablet (connected to the same local network) and navigate to:
```text
http://<orange-pi-ip>:8000
```

## Troubleshooting & Diagnostics

If the service doesn't start or you can't connect, use these commands on the Orange Pi to find the cause:

1. **Check Service Status**:
   ```bash
   sudo systemctl status pi_pad
   ```
   This will show if the service is running, disabled, or crashed (e.g. exit code errors).

2. **Read Real-time Logs**:
   ```bash
   sudo journalctl -u pi_pad -n 50 -f
   ```
   This prints the startup output and logs. If there are Python import errors (like `ModuleNotFoundError`) or path errors, they will show up here.

3. **Check USB Gadget Nodes**:
   ```bash
   ls -l /dev/hidg*
   ```
   Once you click "Init USB HID" on the webpage, you should see `/dev/hidg0` (keyboard) and `/dev/hidg1` (mouse) with `crw-rw-rw-` permissions.