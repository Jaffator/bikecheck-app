# Základní image — Node.js 22 na minimálním Alpine Linuxu (~60MB).
FROM node:22-alpine
# Všechny následující příkazy se spustí v /app uvnitř containeru.
WORKDIR /app
# Zkopíruje package.json a package-lock.json do /app. Dělá se před npm ci kvůli cache — pokud se package.json nezmění, Docker přeskočí instalaci.
COPY package*.json ./
# Nainstaluje závislosti přesně podle package-lock.json (rychlejší a deterministické než npm install).
RUN npm ci
# Zkopíruje zbytek projektu (bez souborů v .dockerignore).
COPY . .
# Vygeneruje Prisma client (TypeScript typy + DB driver) ze schema.prisma.
RUN npx prisma generate
# Dokumentuje že container poslouchá na portu 3000 (neotvírá ho, jen metadata).
EXPOSE 3000
# Při spuštění containeru: nejdřív synchronizuje DB schéma, pak spustí NestJS v dev módu s hot reloadem.
CMD ["sh", "-c", "npx prisma db push && npm run start:dev"]