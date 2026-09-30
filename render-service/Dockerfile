# Playwright's image ships Chromium and its system deps. Its tag must match
# the playwright version in package.json, or the bundled browser won't be
# the one the library expects.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# The image's non-root user — Chromium's sandbox needs it.
USER pwuser

EXPOSE 9723

CMD ["node", "src/server.js"]
