# ========= BUILD STAGE =========
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy dependency definition
COPY go.mod go.sum ./
RUN go mod download

# Copy source & build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/btool-api ./cmd/api


# ========= PRODUCTION STAGE =========
FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates

# Copy compiled binary
COPY --from=builder /out/btool-api ./btool-api

EXPOSE 9721

CMD ["./btool-api"]
