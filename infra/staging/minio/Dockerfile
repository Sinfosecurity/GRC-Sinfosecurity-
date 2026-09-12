FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl
COPY --from=quay.io/minio/minio:latest /usr/bin/minio /usr/bin/minio
EXPOSE 10000
CMD ["/bin/sh", "-c", "minio server /data --address :${PORT:-10000} --console-address :9001"]
