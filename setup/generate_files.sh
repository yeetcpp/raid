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
    cat > "$FILES_DIR/access_dump.txt" <<EOF
Director RFID UID Backup:
$REAL_UID_VALUE
DO NOT SHARE
EOF

    cat > "$FILES_DIR/logs.txt" <<EOF
[INFO] Access controller online
[INFO] Last successful director scan recorded.
[INFO] Sync completed for scan history mirror
EOF

    cat > "$FILES_DIR/notes.txt" <<EOF
Director access subsystem mirror node.
If this backup changes, notify security immediately.
EOF
else
    DECOY_UID="$(pick_decoy_uid)"
    FLAVOR_LINE="$(pick_flavor)"

    cat > "$FILES_DIR/access_dump.txt" <<EOF
UID SYNC FAILED
ACCESS TOKEN CORRUPTED
Candidate UID: $DECOY_UID
EOF

    cat > "$FILES_DIR/logs.txt" <<EOF
[WARN] No valid scans found
[WARN] Replication checksum mismatch
[INFO] Fallback profile loaded
EOF

    cat > "$FILES_DIR/notes.txt" <<EOF
$FLAVOR_LINE
Ignore old badges from archived systems.
EOF
fi

chown -R terminal:terminal /home/player || true
chmod 0644 "$FILES_DIR"/*.txt
