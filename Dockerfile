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

RUN echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update -y && \
    apt-get install -y postgresql-client-14

WORKDIR /usr/local/app

COPY . .

RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]
