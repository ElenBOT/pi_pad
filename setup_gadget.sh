#!/bin/bash
GADGET="/sys/kernel/config/usb_gadget/my_gadget"

cleanup() {
    echo "Cleaning up USB Gadget configurations..."
    # 1. Disconnect physical port mapping using absolute path
    find /sys/kernel/config/usb_gadget -name 'UDC' -exec sh -c 'echo "" > "{}"' \; 2>/dev/null

    # 2. Safely tear down ConfigFS structure bottom-up if directory exists
    if [ -d "$GADGET" ]; then
        find "$GADGET/configs" -type l -exec rm -f {} \; 2>/dev/null
        find "$GADGET" -depth -type d ! -name 'webusb' ! -name 'os_desc' ! -name 'strings' -exec rmdir {} + 2>/dev/null
        rmdir "$GADGET" 2>/dev/null
    fi
    echo "Cleanup complete."
}

# If --clean or clean is specified, just cleanup and exit
if [ "$1" = "clean" ] || [ "$1" = "--clean" ]; then
    cleanup
    exit 0
fi

# Normal run: cleanup first, then load module and create
cleanup

echo "Loading libcomposite..."
modprobe libcomposite


echo "Step 2: Creating new USB Gadget (Combo KM)..."
mkdir -p "$GADGET"
cd "$GADGET"

echo 0x046d > idVendor
echo 0xc52c > idProduct  # Changed to 0xc52c to force descriptor cache reload on Windows host
echo 0x0100 > bcdDevice
echo 0x0200 > bcdUSB

mkdir -p strings/0x409
echo "123456789" > strings/0x409/serialnumber
echo "Logitech" > strings/0x409/manufacturer
echo "USB Receiver" > strings/0x409/product

mkdir -p configs/c.1/strings/0x409
echo "Config 1" > configs/c.1/strings/0x409/configuration
echo 250 > configs/c.1/MaxPower

echo "Step 3: Setting up Keyboard interface (hid.usb0)..."
mkdir -p functions/hid.usb0
echo 1 > functions/hid.usb0/protocol
echo 1 > functions/hid.usb0/subclass
echo 8 > functions/hid.usb0/report_length
python3 -c "import binascii; open('functions/hid.usb0/report_desc', 'wb').write(binascii.unhexlify('05010906a101050719e029e71500250175019508810295017508810395057501050819012905910295017503910395067508150025650507190029658100c0'))"

echo "Step 4: Setting up Mouse interface (hid.usb1) [RELATIVE WITH WHEEL]..."
mkdir -p functions/hid.usb1
echo 2 > functions/hid.usb1/protocol
echo 1 > functions/hid.usb1/subclass
echo 4 > functions/hid.usb1/report_length
python3 -c "import binascii; open('functions/hid.usb1/report_desc', 'wb').write(binascii.unhexlify('05010902a1010901a100050919012903150025019503750181029501750581030501093009311581257f750895028106050109381581257f750895018106c0c0'))"

echo "Step 5: Binding both interfaces to UDC..."
ln -s functions/hid.usb0 configs/c.1/
ln -s functions/hid.usb1 configs/c.1/
ls /sys/class/udc > UDC

# Handle permissions for /dev/hidg0 and /dev/hidg1
chmod 666 /dev/hidg0 /dev/hidg1

echo "Success: Keyboard + Mouse Combo configuration complete!"
