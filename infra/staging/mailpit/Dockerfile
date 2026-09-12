FROM axllent/mailpit:latest
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/mailpit --listen 0.0.0.0:${PORT:-8025} --smtp 0.0.0.0:1025"]
