#!/bin/sh
set -eu

RESTRICTED_BIN="/usr/local/restricted/bin"
TERMINAL_USER="terminal"

block_binaries() {
    for bin in \
        /usr/bin/apt /usr/bin/apt-get /usr/bin/apt-cache /usr/bin/apt-mark \
        /usr/bin/dpkg /usr/bin/dpkg-query /usr/bin/wget /usr/bin/curl \
        /usr/bin/git /usr/bin/ftp /usr/bin/scp /usr/bin/rsync /usr/bin/ssh \
        /usr/bin/docker /usr/local/bin/docker /bin/docker; do
        if [ -e "$bin" ]; then
            chmod 000 "$bin" || true
        fi
    done

    if [ -e /root ]; then
        chmod 000 /root || true
    fi
    
    if [ -e /var/run/docker.sock ]; then
        chmod 000 /var/run/docker.sock || true
    fi
    
    # Block system shell configuration that might call docker
    for file in /etc/bash.bashrc /etc/bashrc /usr/etc/bashrc /etc/profile.d/*; do
        if [ -e "$file" ]; then
            chmod 000 "$file" || true
        fi
    done
}

generate_terminal_files() {
    if [ -x /setup/generate_files.sh ]; then
        /setup/generate_files.sh
    fi

    # Do not expose session secrets to the in-terminal shell environment.
    unset REAL_UID || true
    unset CORRECT_PC || true
    unset COMPUTER_ID || true
}

setup_user_bashrc() {
    # Create bash config that keeps PATH restricted and secure
    mkdir -p /home/player
    
    cat > /home/player/.bashrc << 'BASHRC'
set +H
export PATH="/usr/local/restricted/bin"
export HOME="/home/player"
unset BASH_COMPLETION
unset BASH_ENV
unset ENV
unalias -a 2>/dev/null || true
alias docker='echo Access denied' 2>/dev/null
alias sudo='echo Access denied' 2>/dev/null
PS1='player@terminal:\W$ '
BASHRC
    
    chmod 644 /home/player/.bashrc
    chown terminal:terminal /home/player/.bashrc || true
}

install_wrappers() {
    mkdir -p "$RESTRICTED_BIN"

    cat > "$RESTRICTED_BIN/ls" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
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
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
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
printf '%s\n' "/home/player"
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

    cat > "$RESTRICTED_BIN/od" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/od "$@"
EOF

    cat > "$RESTRICTED_BIN/tr" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/tr "$@"
EOF

    cat > "$RESTRICTED_BIN/sed" << 'EOF'
#!/bin/sh
set -eu
exec /bin/sed "$@"
EOF

    cat > "$RESTRICTED_BIN/date" << 'EOF'
#!/bin/sh
set -eu
exec /bin/date "$@"
EOF

    cat > "$RESTRICTED_BIN/rm" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/rm "$@"
EOF

    cat > "$RESTRICTED_BIN/chown" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/chown "$@"
EOF

    cat > "$RESTRICTED_BIN/chmod" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/chmod "$@"
EOF

    cat > "$RESTRICTED_BIN/mkdir" << 'EOF'
#!/bin/sh
set -eu
for arg in "$@"; do
    case "$arg" in
        /root|/root/*|/etc|/etc/*|/sys|/sys/*|/proc|/proc/*|/var|/var/*|/boot|/boot/*|../*|*/../*|*/..*/*|root|*docker*|*sudo*)
            echo "Access denied" >&2
            exit 1
            ;;
    esac
done
exec /bin/mkdir "$@"
EOF

    cat > "$RESTRICTED_BIN/help" << 'EOF'
#!/bin/sh
set -eu
printf '%s\n' 'Allowed commands: ls cat pwd whoami uname echo clear help mkdir rm chown chmod od tr sed date sudo exit'
printf '%s\n' 'Notes: absolute paths, /root, package managers, and download tools are blocked.'
EOF

    cat > "$RESTRICTED_BIN/id" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/id "$@"
EOF

    cat > "$RESTRICTED_BIN/sudo" << 'EOF'
#!/bin/sh
set -eu
exec /usr/bin/sudo "$@"
EOF

    chmod 0755 "$RESTRICTED_BIN"/*
}

start_shell() {
    # For docker exec usage, just keep the container running
    # docker exec will handle command execution with proper environment
    exec /bin/sleep infinity
}

block_binaries
install_wrappers
setup_user_bashrc
generate_terminal_files
start_shell
