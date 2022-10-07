FROM debian:latest

RUN apt-get update -y

RUN apt-get install -y \
        lsb-release \
        wget \
        nano \
        dos2unix

RUN apt-get install -y \
    nodejs \
    npm \
    cron

# PostgreSQL client (used for pg_dump)
RUN echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update -y && \
    apt-get install -y postgresql-client-14

COPY . /usr/local/my-finance/

RUN crontab -l | { cat; echo "0 0 * * * cd /usr/local/my-finance && /bin/bash ./backup/run.sh"; } | crontab -

RUN cd /usr/local/my-finance/backup && \
    npm install

RUN touch /var/log/cron.log

ENTRYPOINT cron && tail -f /var/log/cron.log
