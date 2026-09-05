# Deploying the API to the Ubuntu server

Target: `btool-api.yaaqin.xyz` (DNS already pointed at the server), reverse-proxied
through nginx to a Docker container publishing only on `127.0.0.1:9721` — the
same pattern as the existing hotel project on this box.

## 1. Get the code onto the server

```bash
git clone git@github.com:yaaqin/Btool.git
cd Btool
```

(If the repo is private and the server doesn't have your SSH key yet, either
add a deploy key on GitHub or `git clone https://github.com/yaaqin/Btool.git`
and enter a personal access token when prompted.)

## 2. Create the production env file

```bash
cd api
cp .env.example .env
```

Edit `api/.env`:

```
PORT=9721
RATE_LIMIT_MAX=3
RATE_LIMIT_WINDOW=4h
CORS_ORIGIN=https://your-frontend.vercel.app
```

`CORS_ORIGIN` must be the frontend's real production URL (Vercel gives you
one after the first deploy — a custom domain later, or the default
`*.vercel.app` one for now). If it doesn't match exactly, the browser will
block every request from the frontend with a CORS error.

## 3. Build and run

```bash
cd ..   # back to repo root, where docker-compose.yml lives
docker compose up -d --build
```

Check it came up:

```bash
docker compose logs -f btool-api
curl http://127.0.0.1:9721/healthz
# {"status":"ok"}
```

The container only publishes to `127.0.0.1:9721` (see `docker-compose.yml`),
not the public interface — nginx is what makes it reachable from the
internet, and only over HTTPS.

## 4. nginx + HTTPS

Copy `deploy/nginx-btool-api.conf.example`:

```bash
sudo cp deploy/nginx-btool-api.conf.example /etc/nginx/sites-available/btool-api.conf
sudo ln -s /etc/nginx/sites-available/btool-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Then get a certificate (installs one and rewrites the config for HTTPS
automatically):

```bash
sudo certbot --nginx -d btool-api.yaaqin.xyz
```

Test:

```bash
curl https://btool-api.yaaqin.xyz/healthz
```

## 5. Point the frontend at it

In Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL=https://btool-api.yaaqin.xyz
```

Redeploy the frontend so the new value gets baked into the build.

## Redeploying after a code change

```bash
cd Btool
git pull
docker compose up -d --build
```

## Rolling back

```bash
git log --oneline -5      # find the commit to go back to
git checkout <commit>
docker compose up -d --build
```
