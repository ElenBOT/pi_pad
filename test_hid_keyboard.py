import time
import struct
import os
import sys

KEYBOARD_DEV = "/dev/hidg0"

# Build the ASCII to HID mapping table (matching hid_mouse.py)
ASCII_TO_HID = {}

# Map lower case a-z
for i in range(26):
    char = chr(ord('a') + i)
    ASCII_TO_HID[char] = (0, 0x04 + i)

# Map upper case A-Z
for i in range(26):
    char = chr(ord('A') + i)
    ASCII_TO_HID[char] = (0x02, 0x04 + i)

# Map digits 1-9
for i in range(9):
    char = chr(ord('1') + i)
    ASCII_TO_HID[char] = (0, 0x1E + i)
ASCII_TO_HID['0'] = (0, 0x27)

# Special characters
ASCII_TO_HID[' '] = (0, 0x2C)
ASCII_TO_HID['\n'] = (0, 0x28)
ASCII_TO_HID['\r'] = (0, 0x28)
ASCII_TO_HID['\t'] = (0, 0x2B)

# Symbols with Shift (for standard US keyboard layout)
ASCII_TO_HID['!'] = (0x02, 0x1E)
ASCII_TO_HID['@'] = (0x02, 0x1F)
ASCII_TO_HID['#'] = (0x02, 0x20)
ASCII_TO_HID['$'] = (0x02, 0x21)
ASCII_TO_HID['%'] = (0x02, 0x22)
ASCII_TO_HID['^'] = (0x02, 0x23)
ASCII_TO_HID['&'] = (0x02, 0x24)
ASCII_TO_HID['*'] = (0x02, 0x25)
ASCII_TO_HID['('] = (0x02, 0x26)
ASCII_TO_HID[')'] = (0x02, 0x27)
ASCII_TO_HID['_'] = (0x02, 0x2D)
ASCII_TO_HID['+'] = (0x02, 0x2E)
ASCII_TO_HID['{'] = (0x02, 0x2F)
ASCII_TO_HID['}'] = (0x02, 0x30)
ASCII_TO_HID['|'] = (0x02, 0x31)
ASCII_TO_HID[':'] = (0x02, 0x33)
ASCII_TO_HID['"'] = (0x02, 0x34)
ASCII_TO_HID['~'] = (0x02, 0x35)
ASCII_TO_HID['<'] = (0x02, 0x36)
ASCII_TO_HID['>'] = (0x02, 0x37)
ASCII_TO_HID['?'] = (0x02, 0x38)

# Symbols without Shift
ASCII_TO_HID['-'] = (0, 0x2D)
ASCII_TO_HID['='] = (0, 0x2E)
ASCII_TO_HID['['] = (0, 0x2F)
ASCII_TO_HID[']'] = (0, 0x30)
ASCII_TO_HID['\\'] = (0, 0x31)
ASCII_TO_HID[';'] = (0, 0x33)
ASCII_TO_HID["'"] = (0, 0x34)
ASCII_TO_HID['`'] = (0, 0x35)
ASCII_TO_HID[','] = (0, 0x36)
ASCII_TO_HID['.'] = (0, 0x37)
ASCII_TO_HID['/'] = (0, 0x38)


def write_keyboard_report(fd, modifiers=0, keys=[0, 0, 0, 0, 0, 0]):
    # Format: BBBBBBBB (8 bytes: modifier, reserved, key1-6)
    report = struct.pack('BBBBBBBB', modifiers, 0, *keys)
    fd.write(report)
    fd.flush()


def main():
    print("==================================================")
    print("      Orange Pi USB HID Keyboard Test Script      ")
    print("==================================================")

    # 1. Check if the device exists
    if not os.path.exists(KEYBOARD_DEV):
        print(f"[-] Error: Device node '{KEYBOARD_DEV}' not found!")
        print("    Please run setup_gadget.sh (or click 'Init USB HID' on UI) first.")
        sys.exit(1)

    print(f"[+] Found device node '{KEYBOARD_DEV}'")

    # 2. Wait for user to focus on text box on host PC
    print("[*] Waiting 3 seconds... Please click/focus inside a text editor on the host PC!")
    for i in range(3, 0, -1):
        print(f"    Starting in {i}...")
        time.sleep(1)

    # 3. Open device and type
    print("[*] Opening device and typing...")
    try:
        with open(KEYBOARD_DEV, 'wb') as fd:
            test_str = "hello world!\n"
            for char in test_str:
                if char in ASCII_TO_HID:
                    modifiers, keycode = ASCII_TO_HID[char]
                    print(f"    [+] Typing '{repr(char)}' (HID: mod={modifiers:02x}, code={keycode:02x})")
                    
                    # Press key
                    write_keyboard_report(fd, modifiers=modifiers, keys=[keycode, 0, 0, 0, 0, 0])
                    time.sleep(0.02)
                    
                    # Release key
                    write_keyboard_report(fd, modifiers=0, keys=[0, 0, 0, 0, 0, 0])
                    time.sleep(0.02)
                else:
                    print(f"    [-] Warning: Character '{repr(char)}' is not mapped to HID.")
    except PermissionError:
        print(f"[-] Error: Permission denied. Please run this script with sudo:")
        print(f"    sudo python3 {sys.argv[0]}")
        sys.exit(1)
    except Exception as e:
        print(f"[-] Error writing to HID device: {e}")
        sys.exit(1)

    print("[+] Test completed successfully!")
    print("==================================================")


if __name__ == "__main__":
    main()
