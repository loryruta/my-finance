CREATE TABLE "users" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "user" VARCHAR(256) NOT NULL UNIQUE,
    password_digest VARCHAR(64) NOT NULL,
    id_selected_wallet INTEGER
);

CREATE TABLE "sessions" (
    id_user INTEGER NOT NULL,
    id_chat INTEGER NOT NULL UNIQUE,
    valid_until TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id_user),
    FOREIGN KEY (id_user) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE "wallets" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_user INTEGER NOT NULL,
    title VARCHAR(256) NOT NULL,
    FOREIGN KEY (id_user) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE "variations" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_wallet INTEGER NOT NULL,
    amount MONEY NOT NULL,
    "timestamp" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    note VARCHAR(256),
    FOREIGN KEY (id_wallet) REFERENCES wallets(id)
        ON DELETE CASCADE
);