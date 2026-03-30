#!/bin/sh
set -eu

RESTRICTED_BIN="/usr/local/restricted/bin"
TERMINAL_USER="terminal"

block_binaries() {
    for bin in \
        /usr/bin/apt /usr/bin/apt-get /usr/bin/apt-cache /usr/bin/apt-mark \
        /usr/bin/dpkg /usr/bin/dpkg-query /usr/bin/wget /usr/bin/curl \
        /usr/bin/git /usr/bin/ftp /usr/bin/scp /usr/bin/rsync /usr/bin/ssh; do
        if [ -e "$bin" ]; then
            chmod 000 "$bin" || true
        fi
    done

    if [ -e /root ]; then
        chmod 000 /root || true
    fi
}

install_wrappers() {
    mkdir -p "$RESTRICTED_BIN"

    cat > "$RESTRICTED_BIN/ls" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /*|*..*|root|/|/root)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/ls --color=never "$@"
EOF

    cat > "$RESTRICTED_BIN/cat" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /*|*..*|root|/|/root)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/cat "$@"
EOF

    cat > "$RESTRICTED_BIN/pwd" << 'EOF'
#!/bin/sh
set -eu
printf '%s\n' "/workspace"
EOF

    cat > "$RESTRICTED_BIN/whoami" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/whoami
EOF

    cat > "$RESTRICTED_BIN/uname" << 'EOF'
#!/bin/sh
set -eu
exec /bin/uname "$@"
EOF

    cat > "$RESTRICTED_BIN/echo" << 'EOF'
#!/bin/sh
set -eu
exec /bin/echo "$@"
EOF

    cat > "$RESTRICTED_BIN/clear" << 'EOF'
#!/bin/sh
set -eu
printf '\033c'
EOF

    cat > "$RESTRICTED_BIN/help" << 'EOF'
#!/bin/sh
set -eu
printf '%s\n' 'Allowed commands: ls cat pwd whoami uname echo clear help sudo exit'
printf '%s\n' 'Notes: absolute paths, /root, package managers, and download tools are blocked.'
EOF

    cat > "$RESTRICTED_BIN/sudo" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/sudo "$@"
EOF

    chmod 0755 "$RESTRICTED_BIN"/*
}

start_shell() {
    export PATH="$RESTRICTED_BIN"
    export HOME="/workspace"

    if [ -n "${TERMINAL_EXEC_CMD:-}" ]; then
        exec /usr/bin/sudo -u "$TERMINAL_USER" -H /usr/bin/env PATH="$RESTRICTED_BIN" HOME="/workspace" /bin/rbash -c "$TERMINAL_EXEC_CMD"
    fi

    exec /usr/bin/sudo -u "$TERMINAL_USER" -H /usr/bin/env PATH="$RESTRICTED_BIN" HOME="/workspace" /bin/rbash
}

block_binaries
install_wrappers
start_shell
