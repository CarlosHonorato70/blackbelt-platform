#!/usr/bin/env python3
"""SSH deploy part 2 - Docker build + health check (key already added, code already pulled)."""
import paramiko
import time
import sys
import io

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "198.199.83.226"
USER = "root"
PASSWORD = "Bb@2026!Str0ng#Deploy"
KEY_PATH = "C:/Users/Carlos Honorato/.ssh/id_ed25519"

def main():
    print(f"[1/3] Connecting to {HOST} via SSH key...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
        client.connect(HOST, username=USER, pkey=key)
        print("  Connected via SSH key!")
    except Exception as e:
        print(f"  Key auth failed ({e}), trying password...")
        client.connect(HOST, username=USER, password=PASSWORD, allow_agent=False, look_for_keys=False)
        print("  Connected via password!")

    # Docker build
    print("[2/3] Docker Compose up --build -d (may take several minutes)...")
    stdin, stdout, stderr = client.exec_command(
        'cd /opt/blackbelt && docker compose up --build -d 2>&1',
        timeout=600
    )
    for line in stdout:
        line = line.strip()
        if line:
            print(f"  {line}")

    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        print(f"  EXIT CODE: {exit_code}")
        for line in stderr:
            print(f"  ERR: {line.strip()}")

    # Health check
    print("[3/3] Health check (waiting 15s for startup)...")
    time.sleep(15)

    stdin, stdout, stderr = client.exec_command('curl -sf http://localhost:5000/api/health 2>&1')
    print(f"  Health: {stdout.read().decode('utf-8', errors='replace').strip()}")

    stdin, stdout, stderr = client.exec_command('cd /opt/blackbelt && docker compose ps 2>&1')
    print(f"  Docker status:")
    for line in stdout:
        print(f"    {line.strip()}")

    client.close()
    print("\nDeploy complete!")

if __name__ == "__main__":
    main()
