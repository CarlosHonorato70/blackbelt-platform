#!/usr/bin/env python3
"""SSH deploy - handles password change via interactive PTY shell."""
import paramiko
import time
import re

HOST = "198.199.83.226"
USER = "root"
PASSWORD = "9f7b22bda3a9d0a3b2249ee5b4"
NEW_PASSWORD = "Bb@2026!Str0ng#Deploy"
SSH_PUBKEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIf3sXv2SJgfbPLin6+CBLozVFjjMpncVD+MAQDJYIrL carlos@blackbelt-dev"

def read_until(chan, patterns, timeout=30):
    """Read from channel until one of the patterns is found."""
    buf = ""
    start = time.time()
    while time.time() - start < timeout:
        if chan.recv_ready():
            data = chan.recv(65535).decode("utf-8", errors="replace")
            buf += data
            for p in patterns:
                if p.lower() in buf.lower():
                    return buf, p
        time.sleep(0.2)
    return buf, None

def send_and_wait(chan, text, patterns, timeout=30):
    """Send text and wait for patterns."""
    chan.send(text + "\n")
    return read_until(chan, patterns, timeout)

def main():
    print(f"[1/6] Connecting to {HOST}...")
    transport = paramiko.Transport((HOST, 22))
    transport.start_client()
    transport.auth_password(USER, PASSWORD)

    if not transport.is_authenticated():
        print("  FAILED to authenticate!")
        return

    print("  Authenticated!")

    # Open interactive shell with PTY
    print("[2/6] Changing password via interactive shell...")
    chan = transport.open_session()
    chan.get_pty(term="xterm", width=120, height=40)
    chan.invoke_shell()
    time.sleep(2)

    # Read initial output (may ask for password change)
    buf, pattern = read_until(chan, ["current", "password:", "$", "#"], timeout=10)
    print(f"  Initial: ...{buf[-200:]}")

    if "current" in buf.lower() or ("password" in buf.lower() and "change" in buf.lower()):
        # Send current password
        print("  Sending current password...")
        buf, p = send_and_wait(chan, PASSWORD, ["new password", "new unix", "enter new"], timeout=10)
        print(f"  After current: ...{buf[-100:]}")

        # Send new password
        print("  Sending new password...")
        buf, p = send_and_wait(chan, NEW_PASSWORD, ["retype", "again", "new password", "$", "#"], timeout=10)
        print(f"  After new: ...{buf[-100:]}")

        # Confirm new password
        if "retype" in (buf or "").lower() or "again" in (buf or "").lower():
            print("  Confirming new password...")
            buf, p = send_and_wait(chan, NEW_PASSWORD, ["$", "#", "updated", "success"], timeout=10)
            print(f"  After confirm: ...{buf[-100:]}")

    # Wait for shell prompt
    time.sleep(2)
    buf, p = read_until(chan, ["$", "#"], timeout=5)
    print(f"  Shell ready!")

    # Now execute commands via this interactive shell
    def shell_cmd(cmd, timeout=30):
        """Execute command in interactive shell."""
        chan.send(cmd + "\n")
        time.sleep(1)
        buf = ""
        start = time.time()
        while time.time() - start < timeout:
            if chan.recv_ready():
                buf += chan.recv(65535).decode("utf-8", errors="replace")
            if buf.endswith("# ") or buf.endswith("$ ") or "root@" in buf.split("\n")[-1]:
                break
            time.sleep(0.3)
        return buf

    # 3. Add SSH key
    print("[3/6] Adding SSH key...")
    shell_cmd("mkdir -p ~/.ssh")
    shell_cmd(f'echo "{SSH_PUBKEY}" >> ~/.ssh/authorized_keys')
    shell_cmd("chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys")
    shell_cmd("sort -u -o ~/.ssh/authorized_keys ~/.ssh/authorized_keys")
    print("  SSH key added!")

    # 4. Pull code
    print("[4/6] Pulling latest code...")
    out = shell_cmd("cd /opt/blackbelt && git fetch origin feat/security-hardening && git checkout feat/security-hardening 2>&1 && git pull origin feat/security-hardening 2>&1", timeout=60)
    # Filter out the command echo
    lines = [l for l in out.split("\n") if not l.startswith("root@") and l.strip()]
    print("  " + "\n  ".join(lines[-5:]))

    # 5. Docker build
    print("[5/6] Docker Compose build (this may take several minutes)...")
    out = shell_cmd("cd /opt/blackbelt && docker compose up --build -d 2>&1", timeout=600)
    lines = [l for l in out.split("\n") if not l.startswith("root@") and l.strip()]
    print("  " + "\n  ".join(lines[-10:]))

    # 6. Health check
    print("[6/6] Checking health (waiting 15s)...")
    time.sleep(15)
    out = shell_cmd("curl -sf http://localhost:5000/api/health 2>&1")
    lines = [l for l in out.split("\n") if "status" in l.lower() or "healthy" in l.lower()]
    print("  " + "\n  ".join(lines) if lines else f"  {out[-200:]}")

    out = shell_cmd("cd /opt/blackbelt && docker compose ps 2>&1")
    lines = [l for l in out.split("\n") if not l.startswith("root@")]
    print("  Docker:\n  " + "\n  ".join(lines[-8:]))

    chan.close()
    transport.close()
    print("\nDeploy complete!")

if __name__ == "__main__":
    main()
