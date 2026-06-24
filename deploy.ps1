# Orange Pi Deployment Script
# Please edit the configuration below to match your Orange Pi details.

$OPI_IP = "op0"      # Replace with your Orange Pi's IP address
$OPI_USER = "op0"              # Replace with your Orange Pi username (e.g. root, opi, orangepi)
$OPI_PORT = "22"               # SSH port (usually 22)
$REMOTE_DIR = "~/pi_pad"       # The target directory on the Orange Pi

# Ensure the script runs in its own directory so relative paths work
Set-Location $PSScriptRoot

# Ensure connection parameters are set
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Pi Pad to Orange Pi at $OPI_IP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Create target directory on Orange Pi if it doesn't exist
Write-Host "[1/2] Preparing remote directory..." -ForegroundColor Yellow
ssh -p $OPI_PORT "${OPI_USER}@${OPI_IP}" "mkdir -p $REMOTE_DIR"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not connect to Orange Pi via SSH to run mkdir. Attempting SCP anyway..."
}

# 2. SCP files to the Orange Pi
Write-Host "[2/2] Copying files via SCP..." -ForegroundColor Yellow
# We copy main server files, shell script, test scripts, systemd service, templates, and static assets
scp -P $OPI_PORT -r main.py hid_mouse.py setup_gadget.sh test_hid_keyboard.py test_hid_mouse.py pi_pad.service requirements.txt static templates "${OPI_USER}@${OPI_IP}:${REMOTE_DIR}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the app on your Orange Pi:" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------"
    Write-Host "Option A (RECOMMENDED): Install as an Auto-Start Service (Run once, auto-starts on boot)" -ForegroundColor Yellow
    Write-Host "1. SSH into your Orange Pi:"
    Write-Host "   ssh -p $OPI_PORT ${OPI_USER}@${OPI_IP}" -ForegroundColor Cyan
    Write-Host "2. Set up virtual environment and register service:"
    Write-Host "   cd $REMOTE_DIR" -ForegroundColor Cyan
    Write-Host "   python3 -m venv venv" -ForegroundColor Cyan
    Write-Host "   ./venv/bin/pip install -r requirements.txt" -ForegroundColor Cyan
    Write-Host "   sudo bash -c 'cat <<EOF > /etc/systemd/system/pi_pad.service" -ForegroundColor Cyan
    Write-Host "   [Unit]" -ForegroundColor Gray
    Write-Host "   Description=Pi Pad - Web Touchpad Server" -ForegroundColor Gray
    Write-Host "   After=network.target" -ForegroundColor Gray
    Write-Host "   [Service]" -ForegroundColor Gray
    Write-Host "   Type=simple" -ForegroundColor Gray
    Write-Host "   User=root" -ForegroundColor Gray
    Write-Host "   WorkingDirectory=\$(pwd)" -ForegroundColor Gray
    Write-Host "   ExecStart=\$(pwd)/venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000" -ForegroundColor Gray
    Write-Host "   ExecStop=\$(pwd)/setup_gadget.sh --clean" -ForegroundColor Gray
    Write-Host "   Restart=always" -ForegroundColor Gray
    Write-Host "   [Install]" -ForegroundColor Gray
    Write-Host "   WantedBy=multi-user.target" -ForegroundColor Gray
    Write-Host "   EOF'" -ForegroundColor Cyan
    Write-Host "   sudo systemctl daemon-reload" -ForegroundColor Cyan
    Write-Host "   sudo systemctl enable pi_pad" -ForegroundColor Cyan
    Write-Host "   sudo systemctl restart pi_pad" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option B: Run manually in current shell (for development/debugging logs):" -ForegroundColor Yellow
    Write-Host "   cd $REMOTE_DIR" -ForegroundColor Cyan
    Write-Host "   python3 -m venv venv  # (if not already done)" -ForegroundColor Cyan
    Write-Host "   ./venv/bin/pip install -r requirements.txt  # (if not already done)" -ForegroundColor Cyan
    Write-Host "   sudo ./venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------------"
    Write-Host "Open your mobile phone web browser and navigate to:" -ForegroundColor Yellow
    Write-Host "   http://${OPI_IP}:8000" -ForegroundColor Cyan
}
else {
    Write-Error "Deployment failed. Please verify the Orange Pi IP address, username, and SSH setup."
}
