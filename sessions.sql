DROP TABLE IF EXISTS "sessions";
CREATE TABLE "sessions" (
	"sid"	TEXT UNIQUE,
	"data"	TEXT,
	"expiry"	INTEGER
);
