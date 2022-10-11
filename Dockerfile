FROM debian:latest

# Essentials
RUN apt-get update -y && \
    apt-get install -y \
        lsb-release \
        wget \
        cron

# Utilities
RUN apt-get install -y \
    nano

# Node.js, npm, python3...
RUN apt-get install -y \
    nodejs \
    npm \
    python3

# Libraries needed for node-gyp (library needed for node-canvas)
RUN apt-get install -y \
        libpixman-1-dev \
        libcairo2-dev \
        libpango1.0-dev \
        libgif-dev

# node-gyp manually built to support arm64 (pre-built binaries not provided)
RUN cd /usr/src/ && \
        git clone https://github.com/Automattic/node-canvas.git && \
        cd node-canvas && \
        npm i -g nan && \
        export NODE_PATH=$(npm root -g) && \
        node-gyp configure && \
        node-gyp build

WORKDIR /usr/src/app/

COPY . .
RUN npm install

# Create cron-job for backup
RUN crontab -l | { cat; echo "0 0 * * * cd /usr/src/app && node ./src/backup.js"; } | crontab -

ENTRYPOINT \
    cron & \
    node ./src/main.js
