CREATE TABLE "usage_counters" (
	"key" varchar(100) NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_key_day_pk" PRIMARY KEY("key","day")
);
