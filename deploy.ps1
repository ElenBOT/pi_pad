# Orange Pi Deployment Script
# Please edit the configuration below to match your Orange Pi details.

$OPI_IP = "op1-case"      # Replace with your Orange Pi's IP address
$OPI_USER = "op1"              # Replace with your Orange Pi username (e.g. root, opi, orangepi)
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
    Write-Host "Option A (RECOMMENDED): Install as an Auto-Start Service (No SSH required next time)" -ForegroundColor Yellow
    Write-Host "1. SSH into your Orange Pi:"
    Write-Host "   ssh -p $OPI_PORT ${OPI_USER}@${OPI_IP}" -ForegroundColor Cyan
    Write-Host "2. Link and start the systemd service:"
    Write-Host "   sudo ln -sf $REMOTE_DIR/pi_pad.service /etc/systemd/system/pi_pad.service" -ForegroundColor Cyan
    Write-Host "   sudo systemctl daemon-reload" -ForegroundColor Cyan
    Write-Host "   sudo systemctl enable pi_pad" -ForegroundColor Cyan
    Write-Host "   sudo systemctl restart pi_pad" -ForegroundColor Cyan
    Write-Host "   (This runs the app as root in the background and auto-starts it on boot!)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option B: Run manually in current shell (for debugging logs):" -ForegroundColor Yellow
    Write-Host "   cd $REMOTE_DIR" -ForegroundColor Cyan
    Write-Host "   sudo python3 -m uvicorn main:app --host 0.0.0.0 --port 8000" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------------"
    Write-Host "Open your mobile phone web browser and navigate to:" -ForegroundColor Yellow
    Write-Host "   http://${OPI_IP}:8000" -ForegroundColor Cyan
} else {
    Write-Error "Deployment failed. Please verify the Orange Pi IP address, username, and SSH setup."
}
