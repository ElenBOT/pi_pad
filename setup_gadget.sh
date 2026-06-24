#!/bin/bash
GADGET="/sys/kernel/config/usb_gadget/my_gadget"
STATE_FILE="/var/run/pi_pad_legacy_modules"

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

    # 3. Restore any conflicting legacy modules that were unloaded
    if [ -f "$STATE_FILE" ]; then
        echo "Restoring legacy USB gadget modules..."
        while IFS= read -r mod; do
            if [ -n "$mod" ]; then
                echo "Reloading module $mod..."
                modprobe "$mod" 2>/dev/null
            fi
        done < "$STATE_FILE"
        rm -f "$STATE_FILE"
    fi
}

# If --clean or clean is specified, just cleanup and exit
if [ "$1" = "clean" ] || [ "$1" = "--clean" ]; then
    cleanup
    exit 0
fi

# Normal run: cleanup first, then load module and create
cleanup

# Detect and unload conflicting legacy modules
ADD_SERIAL=false
ADD_ETHER=false
ADD_STORAGE=false

mkdir -p "$(dirname "$STATE_FILE")"
truncate -s 0 "$STATE_FILE"

for mod in g_serial g_ether g_mass_storage g_multi; do
    if lsmod | grep -q "^$mod"; then
        echo "Conflicting legacy module '$mod' detected. Unloading to free UDC..."
        echo "$mod" >> "$STATE_FILE"
        rmmod "$mod" 2>/dev/null
        
        if [ "$mod" = "g_serial" ]; then ADD_SERIAL=true; fi
        if [ "$mod" = "g_ether" ]; then ADD_ETHER=true; fi
        if [ "$mod" = "g_mass_storage" ]; then ADD_STORAGE=true; fi
    fi
done

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

# Dynamic addition of functions based on detected legacy modules
if [ "$ADD_SERIAL" = true ]; then
    echo "Step 4.5: Setting up CDC ACM Serial interface (acm.usb0)..."
    mkdir -p functions/acm.usb0
fi

if [ "$ADD_ETHER" = true ]; then
    echo "Step 4.6: Setting up CDC ECM Ethernet interface (ecm.usb0)..."
    mkdir -p functions/ecm.usb0
    echo "02:00:00:00:00:01" > functions/ecm.usb0/host_addr
    echo "02:00:00:00:00:02" > functions/ecm.usb0/dev_addr
fi

if [ "$ADD_STORAGE" = true ]; then
    echo "Step 4.7: Setting up Mass Storage interface (mass_storage.usb0)..."
    mkdir -p functions/mass_storage.usb0
    STORAGE_FILE="/var/lib/pi_pad_storage.img"
    if [ ! -f "$STORAGE_FILE" ]; then
        echo "Creating a dummy 64MB storage backing file at $STORAGE_FILE..."
        mkdir -p "$(dirname "$STORAGE_FILE")"
        dd if=/dev/zero of="$STORAGE_FILE" bs=1M count=64 2>/dev/null
        mkfs.vfat "$STORAGE_FILE" 2>/dev/null
    fi
    echo "$STORAGE_FILE" > functions/mass_storage.usb0/lun.0/file
fi

echo "Step 5: Binding interfaces to UDC..."
ln -s functions/hid.usb0 configs/c.1/
ln -s functions/hid.usb1 configs/c.1/

if [ -d "functions/acm.usb0" ]; then
    ln -s functions/acm.usb0 configs/c.1/
fi

if [ -d "functions/ecm.usb0" ]; then
    ln -s functions/ecm.usb0 configs/c.1/
fi

if [ -d "functions/mass_storage.usb0" ]; then
    ln -s functions/mass_storage.usb0 configs/c.1/
fi

ls /sys/class/udc > UDC

# Handle permissions for /dev/hidg0 and /dev/hidg1
chmod 666 /dev/hidg0 /dev/hidg1

echo "Success: Keyboard + Mouse Combo configuration complete!"

