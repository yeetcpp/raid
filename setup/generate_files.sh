#!/bin/sh
set -eu

FILES_DIR="/home/player/files"
mkdir -p "$FILES_DIR"
rm -f "$FILES_DIR"/*

# Inputs are provided by the bridge per session/container invocation.
REAL_UID_VALUE="${REAL_UID:-}"
CORRECT_PC_VALUE="${CORRECT_PC:-}"
COMPUTER_ID_VALUE="${COMPUTER_ID:-}"

if [ -z "$REAL_UID_VALUE" ] || [ -z "$CORRECT_PC_VALUE" ] || [ -z "$COMPUTER_ID_VALUE" ]; then
    echo "Missing REAL_UID/CORRECT_PC/COMPUTER_ID" >&2
    exit 1
fi

random_hex_uid() {
    od -An -N6 -tx1 /dev/urandom | tr -d ' \n' | sed 's/\(..\)/\1:/g; s/:$//' | tr '[:lower:]' '[:upper:]'
}

pick_decoy_uid() {
    case $(( $(od -An -N1 -tu1 /dev/urandom | tr -d ' ') % 4 )) in
        0) echo "FF:12:ZZ:INVALID" ;;
        1) echo "TEMP-UID-$((1000 + $(od -An -N1 -tu1 /dev/urandom | tr -d ' ')))" ;;
        2) echo "OLD_BACKUP_UID: $(random_hex_uid)" ;;
        *) echo "$(random_hex_uid) [UNVERIFIED]" ;;
    esac
}

pick_flavor() {
    case $(( $(od -An -N1 -tu1 /dev/urandom | tr -d ' ') % 6 )) in
        0) echo "TODO: fix coffee machine" ;;
        1) echo "why is the server on fire again" ;;
        2) echo "DO NOT TOUCH THIS TERMINAL" ;;
        3) echo "backup failed lol" ;;
        4) echo "maintenance delayed due to badge relay" ;;
        *) echo "who changed the root password this time" ;;
    esac
}

if [ "$COMPUTER_ID_VALUE" = "$CORRECT_PC_VALUE" ]; then
    # Correct PC - contains real L3 UID
    cat > "$FILES_DIR/backup_directors.txt" <<EOF
Director RFID UID Backup:
$REAL_UID_VALUE
DO NOT SHARE
EOF

    cat > "$FILES_DIR/system_logs.txt" <<EOF
[INFO] Access controller online
[INFO] Last successful director scan recorded.
[INFO] Sync completed for scan history mirror
[INFO] Director level authentication: VERIFIED
EOF

    cat > "$FILES_DIR/access_keys.txt" <<EOF
Director access subsystem mirror node.
If this backup changes, notify security immediately.
TRUSTED_CHECKSUM: OK
EOF
else
    # Decoy computers - completely different content and filenames
    case "$COMPUTER_ID_VALUE" in
    1)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/device_inventory.txt" <<EOF
INVENTORY REPORT - Q4 2025
Device Type: Terminal Node
MAC: 00:1A:2B:3C:4D:5E
Serial: INV-001-2025
Status: Operational
EOF

        cat > "$FILES_DIR/maintenance_log.txt" <<EOF
2025-12-15: Scheduled maintenance performed
2025-12-08: Memory upgrade completed
2025-11-30: Security patches applied
Last Check: $(date +%Y-%m-%d)
EOF

        cat > "$FILES_DIR/hardware_specs.txt" <<EOF
CPU: 4-core 2.4GHz
RAM: 8GB DDR4
Storage: 256GB SSD
Network: Gigabit Ethernet
Temperature: 38C
EOF
        ;;
    2)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/incident_reports.txt" <<EOF
INCIDENT TRACKING
Incident #2025-0847: Network spike detected
Resolution: Cache cleared, service restored
Incident #2025-0823: RFID reader malfunction
Resolution: Awaiting replacement hardware
Status: Under Investigation
EOF

        cat > "$FILES_DIR/configuration.txt" <<EOF
Terminal ID: TERM-002
Network Config: DHCP enabled
Timeout: 300s
Authentication: LDAP
Last Sync: 2025-12-20T14:32:11Z
EOF

        cat > "$FILES_DIR/patches.txt" <<EOF
Kernel: 5.15.0-1023
OpenSSL: 1.1.1k
glibc: 2.31
Applied: 2025-12-15T09:22:00Z
Pending: None
EOF
        ;;
    3)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/user_data.txt" <<EOF
ACTIVE SESSIONS
Session ID: 5847-ABCD
User: operator@corp
Login Time: 09:15:23
Last Activity: 14:47:52
Terminal State: Locked
EOF

        cat > "$FILES_DIR/session_history.txt" <<EOF
Previous Sessions:
2025-12-20 09:15 - 18:30 (operator@corp)
2025-12-19 08:45 - 17:15 (admin@corp)
2025-12-18 10:00 - 12:30 (operator@corp)
Access Level: Basic
EOF

        cat > "$FILES_DIR/permissions.txt" <<EOF
Read: /etc/hosts, /var/log
Write: /tmp, /var/tmp
Execute: Standard utilities
Restricted: /root, /etc/shadow
EOF
        ;;
    4)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/archive_index.txt" <<EOF
ARCHIVE CATALOG
File: backup_2025-12-01.tar.gz (2.3GB)
File: backup_2025-11-01.tar.gz (2.1GB)
File: backup_2025-10-01.tar.gz (2.2GB)
Total Archived: 6.6GB
Compression: gzip
EOF

        cat > "$FILES_DIR/recovery.txt" <<EOF
Last Successful Backup: 2025-12-20T02:00:00Z
Recovery Point: 2025-12-19T02:00:00Z
Verification: PASSED
Estimated Recovery Time: 45 minutes
Backup Location: Secure
EOF

        cat > "$FILES_DIR/retention_policy.txt" <<EOF
Monthly: Keep 12 copies
Weekly: Keep 8 copies
Daily: Keep 7 copies
Purge Old: Automatic
Retention: 1 year compliance required
EOF
        ;;
    5)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/credentials_cache.txt" <<EOF
CACHED CREDENTIALS
Certificate: director-ca.pem (Valid)
Issued: 2024-01-15
Expires: 2026-01-15
Fingerprint: 7A:B3:C2:D1:E0:F9
Status: VALID
EOF

        cat > "$FILES_DIR/audit_trail.txt" <<EOF
2025-12-20 14:52:11 - Authentication success
2025-12-20 14:15:33 - Access denied: insufficient privileges
2025-12-20 13:28:45 - Token validated
2025-12-20 12:11:22 - Permission check passed
EOF

        cat > "$FILES_DIR/security_state.txt" <<EOF
Firewall: ENABLED
IDS/IPS: ACTIVE
Encryption: AES-256
TLS Version: 1.3
Last Audit: 2025-12-15
Compliance: COMPLIANT
EOF
        ;;
    *)
        DECOY_UID="$(pick_decoy_uid)"
        cat > "$FILES_DIR/process_monitor.txt" <<EOF
RUNNING PROCESSES
sshd: 1 instance
systemd-journal: 1 instance
rsyslog: 1 instance
terminal-app: 1 instance
auth-service: 1 instance
EOF

        cat > "$FILES_DIR/network_stats.txt" <<EOF
Packets In: 1,847,263
Packets Out: 2,115,847
Bytes In: 512.3 MB
Bytes Out: 683.7 MB
Errors: 0
Dropped: 0
EOF

        cat > "$FILES_DIR/disk_usage.txt" <<EOF
Total: 256GB
Used: 156GB (61%)
Available: 100GB (39%)
Inodes Used: 234,567
Filesystem: ext4
Last Check: 2025-12-20
EOF
        ;;
    esac
fi

chown -R terminal:terminal /home/player || true
chmod 0644 "$FILES_DIR"/*.txt
