FROM debian:latest

# Utilities
RUN apt-get update -y && \
    apt-get install -y \
        lsb-release \
        wget \
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
RUN cd /usr/local/ && \
        git clone https://github.com/Automattic/node-canvas.git && \
        cd node-canvas && \
        npm i -g nan && \
        export NODE_PATH=$(npm root -g) && \
        node-gyp configure && \
        node-gyp build

# PostgreSQL client (used for pg_dump)
RUN echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update -y && \
    apt-get install -y postgresql-client-14

WORKDIR /usr/local/my-finance/app/

COPY . .
RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]
