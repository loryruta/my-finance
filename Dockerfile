FROM debian:latest

RUN apt-get update -y && \
    apt-get install -y \
        lsb-release \
        wget \
        nano

RUN apt-get install -y \
    nodejs \
    npm \
    python3

RUN apt-get install -y \
        libpixman-1-dev \
        libcairo2-dev \
        libpango1.0-dev \
        libgif-dev

RUN cd /usr/local/ && \
        git clone https://github.com/Automattic/node-canvas.git && \
        cd node-canvas && \
        npm i -g nan && \
        export NODE_PATH=$(npm root -g) && \
        node-gyp configure && \
        node-gyp build

RUN echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update -y && \
    apt-get install -y postgresql-client-14

WORKDIR /usr/local/app

COPY . .

RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]
