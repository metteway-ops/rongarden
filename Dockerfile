# Brug en officiel Node-version
FROM node18

# Opret arbejdsmappe
WORKDIR usrsrcapp

# Kopier package.json og installér biblioteker
COPY package.json .
RUN npm install

# Kopier resten af koden
COPY . .

# Start serveren
CMD [ node, server.js ]