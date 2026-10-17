#!/usr/bin/env bash
# ==============================================================================
# Script de Atualização e Publicação do APK — Aranduê MEI
# ==============================================================================
# Fluxo:
# 1. Compila o frontend React/Vite (dist)
# 2. Sincroniza os assets para o Capacitor Android
# 3. Compila o APK de depuração via Gradle
# 4. Salva uma cópia versionada em dist-apk/
# 5. Se informado um diretório do Google Drive, copia os APKs automaticamente.
#
# Uso:
#   ./scripts/update_apk_drive.sh [caminho_pasta_google_drive]
# Ou via variável de ambiente:
#   GOOGLE_DRIVE_PATH="/caminho/do/drive" ./scripts/update_apk_drive.sh
# ==============================================================================

set -euo pipefail

# Diretório raiz do repositório
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Cores para terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}📱 Aranduê MEI — Build Mobile & Sincronização Google Drive${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 1. Configurar variáveis de ambiente do Android e Java
export JAVA_HOME="${JAVA_HOME:-/home/joaovictor/.local/share/mise/installs/java/21.0.2}"
export ANDROID_HOME="${ANDROID_HOME:-/home/joaovictor/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [ ! -d "$JAVA_HOME" ]; then
  if command -v java >/dev/null 2>&1; then
    JAVA_PATH="$(readlink -f "$(command -v java)")"
    export JAVA_HOME="$(dirname "$(dirname "$JAVA_PATH")")"
  fi
fi

echo -e "☕ JAVA_HOME: ${GREEN}$JAVA_HOME${NC}"
echo -e "🤖 ANDROID_HOME: ${GREEN}$ANDROID_HOME${NC}"

# Garantir que o local.properties no Android aponte para o SDK correto
mkdir -p "$REPO_ROOT/frontend/android"
echo "sdk.dir=$ANDROID_HOME" > "$REPO_ROOT/frontend/android/local.properties"

# 2. Configuração da API de Backend para o Build Mobile
export VITE_API_URL="${VITE_API_URL:-https://projeto-final-arandue.vercel.app/api}"
echo -e "🌐 VITE_API_URL: ${GREEN}$VITE_API_URL${NC}"

# 3. Build do Frontend
echo -e "\n${BLUE}📦 [1/4] Compilando frontend (Vite)...${NC}"
npm --prefix frontend run build

# 3. Sync Capacitor
echo -e "\n${BLUE}🔄 [2/4] Sincronizando assets com Capacitor Android...${NC}"
(
  cd "$REPO_ROOT/frontend"
  npx cap sync android
)

# 4. Build do APK com Gradle
echo -e "\n${BLUE}⚙️  [3/4] Compilando APK via Gradle (assembleDebug)...${NC}"
(
  cd "$REPO_ROOT/frontend/android"
  ./gradlew assembleDebug
)

# 5. Localizar e organizar o APK gerado
ORIGINAL_APK="$REPO_ROOT/frontend/android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$ORIGINAL_APK" ]; then
  echo -e "${RED}❌ Erro: APK não foi encontrado em $ORIGINAL_APK${NC}"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DIST_DIR="$REPO_ROOT/dist-apk"
mkdir -p "$DIST_DIR"

LATEST_APK="$DIST_DIR/arandue-mei-latest.apk"
TIMESTAMPED_APK="$DIST_DIR/arandue-mei-${TIMESTAMP}.apk"

cp "$ORIGINAL_APK" "$LATEST_APK"
cp "$ORIGINAL_APK" "$TIMESTAMPED_APK"

FILE_SIZE=$(du -h "$LATEST_APK" | cut -f1)
echo -e "\n${GREEN}✅ APK compilado com sucesso! (${FILE_SIZE})${NC}"
echo -e "   - Versão fixa:       $LATEST_APK"
echo -e "   - Versão carimbada:  $TIMESTAMPED_APK"

# 6. Sincronização com o Google Drive
DRIVE_DESTINATION="${1:-${GOOGLE_DRIVE_PATH:-${GOOGLE_DRIVE_DIR:-}}}"

if [ -n "$DRIVE_DESTINATION" ]; then
  if [ -d "$DRIVE_DESTINATION" ]; then
    echo -e "\n${BLUE}☁️  [4/4] Enviando APK para o Google Drive...${NC}"
    cp -v "$LATEST_APK" "$DRIVE_DESTINATION/"
    cp -v "$TIMESTAMPED_APK" "$DRIVE_DESTINATION/"
    echo -e "${GREEN}🎉 Arquivos copiados com sucesso para:${NC} $DRIVE_DESTINATION"
  else
    echo -e "\n${YELLOW}⚠️  Aviso: O caminho do Google Drive informado não é um diretório válido:${NC}"
    echo -e "   '$DRIVE_DESTINATION'"
    echo -e "   O APK permanece salvo localmente em: $DIST_DIR"
  fi
else
  echo -e "\n${YELLOW}ℹ️  [4/4] Nenhuma pasta do Google Drive foi informada.${NC}"
  echo -e "   Para enviar automaticamente, execute:"
  echo -e "     ${GREEN}./scripts/update_apk_drive.sh /seu/caminho/do/GoogleDrive${NC}"
  echo -e "   Ou defina a variável no ambiente:"
  echo -e "     ${GREEN}export GOOGLE_DRIVE_PATH=\"/seu/caminho/do/GoogleDrive\"${NC}"
fi

echo -e "\n${GREEN}🚀 Concluído com sucesso!${NC}\n"
