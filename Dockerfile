FROM debian:latest

RUN apt-get update
RUN apt-get install -y \
    nodejs \
    npm \
    python3

ENTRYPOINT ["tail", "-f", "/dev/null"]
