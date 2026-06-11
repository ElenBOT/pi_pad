import time
import struct
import os
import sys

MOUSE_DEV = "/dev/hidg1"


def write_mouse_report(fd, buttons=0, dx=0, dy=0, wheel=0):
    report = struct.pack('bbbb', buttons, dx, dy, wheel)
    fd.write(report)
    fd.flush()


def main():
    print("==================================================")
    print("        Orange Pi USB HID Mouse Test Script       ")
    print("==================================================")

    # 1. Check if the device exists
    if not os.path.exists(MOUSE_DEV):
        print(f"[-] Error: Device node '{MOUSE_DEV}' not found!")
        print("    Please run setup_gadget.sh (or click 'Init USB HID' on UI) first.")
        sys.exit(1)

    print(f"[+] Found device node '{MOUSE_DEV}'")

    # 2. Wait for user
    print("[*] Waiting 3 seconds... Please focus on your host PC screen!")
    for i in range(3, 0, -1):
        print(f"    Starting in {i}...")
        time.sleep(1)

    # 3. Open device and move mouse in a square pattern
    print("[*] Opening device and writing mouse reports...")
    try:
        with open(MOUSE_DEV, 'wb') as fd:
            # Let's do a test write first
            try:
                write_mouse_report(fd, 0, 0, 0, 0)
            except OSError as e:
                if e.errno == 22:
                    print("[-] Error: Write failed with Invalid Argument (EINVAL).")
                    print("    This means the kernel gadget expects a 3-byte relative report,")
                    print("    but this script sent a 4-byte relative report.")
                    print("    Please check if setup_gadget.sh was successfully re-run.")
                    sys.exit(1)
                else:
                    raise e

            # Move in a square pattern
            steps = 20
            delay = 0.02

            print("    [+] Moving Right...")
            for _ in range(steps):
                write_mouse_report(fd, 0, 5, 0, 0)
                time.sleep(delay)

            print("    [+] Moving Down...")
            for _ in range(steps):
                write_mouse_report(fd, 0, 0, 5, 0)
                time.sleep(delay)

            print("    [+] Moving Left...")
            for _ in range(steps):
                write_mouse_report(fd, 0, -5, 0, 0)
                time.sleep(delay)

            print("    [+] Moving Up...")
            for _ in range(steps):
                write_mouse_report(fd, 0, 0, -5, 0)
                time.sleep(delay)

    except PermissionError:
        print(f"[-] Error: Permission denied. Please run this script with sudo:")
        print(f"    sudo python3 {sys.argv[0]}")
        sys.exit(1)
    except Exception as e:
        print(f"[-] Error writing to HID device: {e}")
        sys.exit(1)

    print("[+] Test completed successfully! Cursor should have moved in a square.")
    print("==================================================")


if __name__ == "__main__":
    main()
