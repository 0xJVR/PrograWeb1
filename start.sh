#!/bin/bash

# Script de inicio para Portal de Productos

echo "🚀 Iniciando Portal de Productos..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm instalado: $(npm --version)"
echo ""

# Verificar si existe node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Dependencias instaladas correctamente"
    else
        echo -e "${RED}❌ Error al instalar dependencias${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Dependencias ya instaladas"
fi

echo ""

# Verificar si existe archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Creando archivo .env desde .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Archivo .env creado"
    echo -e "${YELLOW}⚠️  Recuerda configurar las variables en .env${NC}"
else
    echo -e "${GREEN}✓${NC} Archivo .env encontrado"
fi

echo ""

# Preguntar si quiere inicializar la base de datos
read -p "¿Deseas inicializar la base de datos con datos de prueba? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}🗄️  Inicializando base de datos...${NC}"
    node src/scripts/seedDatabase.js
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Base de datos inicializada"
    else
        echo -e "${RED}❌ Error al inicializar base de datos${NC}"
        echo "Asegúrate de que MongoDB esté corriendo"
    fi
fi

echo ""

# Preguntar modo de ejecución
echo -e "${BLUE}🎯 Selecciona el modo de ejecución:${NC}"
echo -e "  1) ${YELLOW}Modo desarrollo${NC} (npm run dev - con auto-recarga)"
echo -e "  2) ${YELLOW}Modo producción${NC} (npm start)"
echo -e "  3) ${YELLOW}Solo preparación${NC} (no iniciar aplicación)"
echo ""

read -p "Ingresa tu elección (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo ""
        echo -e "${GREEN}🚀 Iniciando aplicación en modo desarrollo...${NC}"
        echo -e "${YELLOW}📝 La aplicación se reiniciará automáticamente con cada cambio${NC}"
        echo -e "${GREEN}🌐 La aplicación estará disponible en: http://localhost:3000${NC}"
        echo ""
        echo -e "${BLUE}Usuarios de prueba:${NC}"
        echo -e "  Admin: ${YELLOW}admin@test.com${NC} / ${YELLOW}admin123${NC}"
        echo -e "  User:  ${YELLOW}user@test.com${NC} / ${YELLOW}user123${NC}"
        echo ""
        echo -e "${YELLOW}Presiona Ctrl+C para detener el servidor${NC}"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo -e "${GREEN}🚀 Iniciando aplicación en modo producción...${NC}"
        echo -e "${GREEN}🌐 La aplicación estará disponible en: http://localhost:3000${NC}"
        echo ""
        echo -e "${BLUE}Usuarios de prueba:${NC}"
        echo -e "  Admin: ${YELLOW}admin@test.com${NC} / ${YELLOW}admin123${NC}"
        echo -e "  User:  ${YELLOW}user@test.com${NC} / ${YELLOW}user123${NC}"
        echo ""
        echo -e "${YELLOW}Presiona Ctrl+C para detener el servidor${NC}"
        echo ""
        npm start
        ;;
    3)
        echo ""
        echo -e "${GREEN}✅ Preparación completada${NC}"
        echo ""
        echo -e "Para iniciar la aplicación manualmente:"
        echo -e "  ${YELLOW}npm start${NC}     - Modo producción"
        echo -e "  ${YELLOW}npm run dev${NC}   - Modo desarrollo"
        echo ""
        echo -e "${GREEN}🌐 La aplicación estará disponible en: http://localhost:3000${NC}"
        echo ""
        echo -e "${BLUE}Usuarios de prueba:${NC}"
        echo -e "  Admin: ${YELLOW}admin@test.com${NC} / ${YELLOW}admin123${NC}"
        echo -e "  User:  ${YELLOW}user@test.com${NC} / ${YELLOW}user123${NC}"
        ;;
    *)
        echo -e "${RED}❌ Opción inválida. Saliendo.${NC}"
        exit 1
        ;;
esac