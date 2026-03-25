# Kubernetes Manifests

Manifest ini disesuaikan untuk cluster tutorial on-premise:

- tanpa ingress controller
- akses luar cluster memakai `Service` bertipe `LoadBalancer` melalui MetalLB
- `frontend`, `catalog-service`, `order-service`, dan `notification-service` masing-masing punya `LoadBalancer`
- database dan RabbitMQ tetap internal `ClusterIP`
- database dan RabbitMQ memakai `emptyDir` agar tidak bergantung pada `StorageClass`

Setiap komponen tetap dipisah ke deployment/pod masing-masing:

- `catalog-service`
- `order-service`
- `notification-service`
- `frontend`
- `rabbitmq`
- `catalog-db`
- `order-db`
- `notification-db`

## Apply Baseline

```bash
kubectl apply -k k8s
```

Lalu cek hingga semua pod `Running` dan semua service mendapat `EXTERNAL-IP`:

```bash
kubectl get pods -n suilens-2306275084 -o wide
kubectl get svc -n suilens-2306275084
```

IP eksternal sudah dipatok statis dari pool MetalLB kamu:

- `frontend` -> `192.168.18.242:80`
- `catalog-service` -> `192.168.18.241:3001`
- `order-service` -> `192.168.18.244:3002`
- `notification-service` -> `192.168.18.243:3003`

Frontend config sudah mengarah ke IP tersebut, jadi tidak perlu edit `ConfigMap` lagi.

## Run Migrations + Seed

Setelah database dan aplikasi dasar hidup:

```bash
kubectl apply -f k8s/jobs.yaml
kubectl wait --for=condition=complete job/catalog-migrate -n suilens-2306275084 --timeout=180s
kubectl wait --for=condition=complete job/order-migrate -n suilens-2306275084 --timeout=180s
kubectl wait --for=condition=complete job/notification-migrate -n suilens-2306275084 --timeout=180s
kubectl wait --for=condition=complete job/catalog-seed -n suilens-2306275084 --timeout=180s
```

Jika ingin menjalankan ulang job yang sama, hapus dulu job lamanya:

```bash
kubectl delete job catalog-migrate order-migrate notification-migrate catalog-seed -n suilens-2306275084
```

## Access App

Lihat IP frontend:

```bash
kubectl get svc frontend -n suilens-2306275084
```

Buka `http://<EXTERNAL-IP>`.

Frontend akan mengakses backend langsung melalui `LoadBalancer` masing-masing service.

## OpenAPI Screenshots

Karena backend sudah diekspos lewat `LoadBalancer`, kamu bisa buka langsung:

```bash
kubectl get svc -n suilens-2306275084
```

Lalu buka:

- `http://192.168.18.241:3001/swagger`
- `http://192.168.18.244:3002/swagger`
- `http://192.168.18.243:3003/swagger`

## Notes

- `frontend` masih menjalankan `pnpm dev`, jadi manifest ini memang ditujukan untuk demo/tugas, bukan production.
- IP `192.168.18.241-244` harus benar-benar masih kosong di jaringan LAN/VirtualBox kamu. Jika salah satu sudah terpakai, MetalLB tidak akan bisa mengumumkan IP itu dengan aman.
- Karena volume memakai `emptyDir`, data PostgreSQL dan RabbitMQ akan hilang jika pod direstart atau pindah node.
- Jika ingin persistensi di cluster on-premise, langkah berikutnya adalah membuat static `PersistentVolume` sendiri.
