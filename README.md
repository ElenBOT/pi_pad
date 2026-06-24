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

Debug:
```bash
# check USB configFS exist
ls /sys/kernel/config/usb_gadget

# check OTG port UDC
ls /sys/class/udc

# check gadget forwarded UDC target 
cat /sys/kernel/config/usb_gadget/my_gadget/UDC

# check hid nodes
ls -l /dev/hidg*

# check configuration
ls -l /sys/kernel/config/usb_gadget/my_gadget/configs/c.1/
```

Uninstall
```bash
# remove service
sudo systemctl disable pi_pad
sudo systemctl stop pi_pad
sudo systemctl daemon-reload
sudo rm /etc/systemd/system/pi_pad.service

# remove codes and venv
sudo rm -rf ~/pi_pad
```
