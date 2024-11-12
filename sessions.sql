DROP TABLE IF EXISTS "sessions";
CREATE TABLE "sessions" (
	"sid"	TEXT UNIQUE,
	"data"	TEXT,
	"expiry"	INTEGER
);

DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
	"key"	TEXT UNIQUE,
	"value"	TEXT
);

INSERT INTO users (key, value) VALUES ("admin", '{"username": "admin", "password": "admin", "email": "admin@admin.com", "name": "Administrateur", "avatar": "https://avatars.githubusercontent.com/u/101352034?s=200&v=4", "bio": "admin", "createdAt": "1689968000000", "updatedAt": "1689968000000", "role": "admin", "isAdmin": 1, "isBanned": 0, "isVerified": 1, "isDeleted": 0}');

DROP TABLE IF EXISTS "favorites";
CREATE TABLE "favorites" (
	"id"	INTEGER UNIQUE,
	"username"	TEXT,
	"songId"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
);

INSERT INTO favorites (id, username, songId) VALUES (1, "admin", 18744);
INSERT INTO favorites (id, username, songId) VALUES (2, "admin", 11928);
