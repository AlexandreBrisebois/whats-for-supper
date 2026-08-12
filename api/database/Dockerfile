FROM sqldef/psqldef:3.11.19 AS sqldef

FROM postgres:18

COPY --from=sqldef /usr/local/bin/sqldef /usr/local/bin/sqldef
COPY schema.sql /schema.sql
COPY compatibility.sql /compatibility.sql
COPY migrate.sh /usr/local/bin/migrate

RUN chmod +x /usr/local/bin/migrate

ENTRYPOINT ["migrate"]
