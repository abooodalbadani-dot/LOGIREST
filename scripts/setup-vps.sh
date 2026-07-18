#!/usr/bin/env bash
# ==============================================================================
# OTANTIK KITCHEN / LogiRest — VPS Bootstrap Script
# ==============================================================================
# USAGE:
#   1. Upload to your VPS:
#        scp scripts/setup-vps.sh root@<VPS_IP>:/root/setup-vps.sh
#   2. Make it executable:
#        chmod +x /root/setup-vps.sh
#   3. Run as root (or with sudo):
#        sudo bash /root/setup-vps.sh
#
# WHAT IT DOES (in order):
#   1. Updates & upgrades apt packages
#   2. Installs essential system packages
#   3. Installs Docker Engine (official convenience script)
#   4. Enables & starts Docker systemd service
#   5. Configures UFW firewall (SSH 22, HTTP 80, HTTPS 443)
#   6. Creates deployment directory /opt/otantik-kitchen
#
# TESTED ON: Ubuntu 22.04 LTS / 24.04 LTS (Debian-based)
# ==============================================================================

set -e  # Exit immediately if any command exits with a non-zero status
set -u  # Treat unset variables as errors
set -o pipefail  # Catch errors in pipelines (e.g. curl | sh)

# ------------------------------------------------------------------------------
# COLOUR HELPERS
# ------------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

step()    { echo -e "\n${CYAN}${BOLD}▶  $*${RESET}"; }
success() { echo -e "${GREEN}✔  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
die()     { echo -e "${RED}✘  ERROR: $*${RESET}" >&2; exit 1; }

# ------------------------------------------------------------------------------
# GUARD: Must be run as root
# ------------------------------------------------------------------------------
if [[ "$(id -u)" -ne 0 ]]; then
  die "This script must be run as root (or with sudo). Aborting."
fi

DEPLOY_DIR="/opt/otantik-kitchen"
CALLER_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"

echo -e "\n${BOLD}══════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  OTANTIK KITCHEN — VPS Bootstrap  $(date '+%Y-%m-%d %H:%M:%S UTC')${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════${RESET}"

# ==============================================================================
# STEP 1 — Update & upgrade apt package index
# ==============================================================================
step "STEP 1/6 — Updating apt package index and upgrading installed packages..."

apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
  -o Dpkg::Options::="--force-confdef" \
  -o Dpkg::Options::="--force-confold"

success "System packages updated and upgraded."

# ==============================================================================
# STEP 2 — Install essential packages
# ==============================================================================
step "STEP 2/6 — Installing essential packages..."

DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl \
  git \
  ufw \
  apt-transport-https \
  ca-certificates \
  software-properties-common \
  gnupg \
  lsb-release \
  htop \
  unzip

success "Essential packages installed: curl, git, ufw, apt-transport-https, ca-certificates, software-properties-common, gnupg, lsb-release, htop, unzip."

# ==============================================================================
# STEP 3 — Install Docker Engine (official convenience script)
# ==============================================================================
step "STEP 3/6 — Installing Docker Engine via official convenience script..."

if command -v docker &>/dev/null; then
  warn "Docker is already installed ($(docker --version)). Skipping installation."
else
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh

  # Add the calling user to the docker group so they can run docker without sudo
  if id "${CALLER_USER}" &>/dev/null && [[ "${CALLER_USER}" != "root" ]]; then
    usermod -aG docker "${CALLER_USER}"
    warn "User '${CALLER_USER}' added to the 'docker' group. Log out and back in for this to take effect."
  fi
fi

success "Docker Engine installed: $(docker --version)."

# ==============================================================================
# STEP 4 — Enable and start the Docker systemd service
# ==============================================================================
step "STEP 4/6 — Enabling and starting Docker systemd service..."

systemctl enable docker
systemctl start docker

if systemctl is-active --quiet docker; then
  success "Docker service is active and enabled on boot."
else
  die "Docker service failed to start. Check: journalctl -xeu docker.service"
fi

# ==============================================================================
# STEP 5 — Configure UFW firewall
# ==============================================================================
step "STEP 5/6 — Configuring UFW firewall rules..."

# Reset to defaults (non-interactive) to ensure a clean slate
ufw --force reset

ufw default deny incoming
ufw default allow outgoing

ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Caddy → Let'\''s Encrypt + web redirect)'
ufw allow 443/tcp comment 'HTTPS (Caddy TLS termination)'

# Enable UFW non-interactively (--force skips the "may disrupt SSH" prompt)
ufw --force enable

success "UFW firewall enabled. Active rules:"
ufw status verbose

# ==============================================================================
# STEP 6 — Create deployment directory
# ==============================================================================
step "STEP 6/6 — Creating deployment directory at ${DEPLOY_DIR}..."

mkdir -p "${DEPLOY_DIR}"

# Set ownership to the calling user (not root) so deploy scripts can write files
if id "${CALLER_USER}" &>/dev/null && [[ "${CALLER_USER}" != "root" ]]; then
  chown -R "${CALLER_USER}:${CALLER_USER}" "${DEPLOY_DIR}"
  success "Deployment directory created at ${DEPLOY_DIR} (owner: ${CALLER_USER})."
else
  # Running as root with no sudo user — keep root ownership
  success "Deployment directory created at ${DEPLOY_DIR} (owner: root)."
fi

# ==============================================================================
# DONE
# ==============================================================================
echo -e "\n${GREEN}${BOLD}══════════════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✔  VPS bootstrap complete!${RESET}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════${RESET}"
echo -e ""
echo -e "${BOLD}Next steps:${RESET}"
echo -e "  1. Clone the repository into the deployment directory:"
echo -e "       git clone <repo-url> ${DEPLOY_DIR}"
echo -e ""
echo -e "  2. Copy and fill in your secrets:"
echo -e "       cp ${DEPLOY_DIR}/.env.production.example ${DEPLOY_DIR}/.env.prod"
echo -e "       nano ${DEPLOY_DIR}/.env.prod"
echo -e ""
echo -e "  3. Build and start all services:"
echo -e "       DOCKER_BUILDKIT=1 docker compose \\"
echo -e "         -f ${DEPLOY_DIR}/docker-compose.prod.yml \\"
echo -e "         --env-file ${DEPLOY_DIR}/.env.prod \\"
echo -e "         up -d --build"
echo -e ""
echo -e "  4. First-boot database seed:"
echo -e "       docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml exec api npm run prisma:seed"
echo -e ""
if [[ "${CALLER_USER}" != "root" ]]; then
  echo -e "${YELLOW}  ⚠  Remember to log out and back in so the 'docker' group membership takes effect for user '${CALLER_USER}'.${RESET}"
  echo -e ""
fi
