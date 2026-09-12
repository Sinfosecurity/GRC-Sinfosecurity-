FROM clamav/clamav:1.4
ENV CLAMD_STARTUP_TIMEOUT=1800
# Official image listens on TCP 3310. Keep it private-network only; Render pserv has no public URL.
EXPOSE 3310
