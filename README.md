# 📝 Product Importer	

A full-stack Product Importer application built using **Django REST Framework**, **React**, **Celery**, and **PostgreSQL**, deployed using modern online services.

## Tech Stack

### Backend (API)
- Django
- Django REST Framework
- JWT Authentication
- PostgreSQL
- Celery + Redis (async processing)

### Frontend
- React 

### Deployment
| Component | Platform |
|----------|----------|
| Backend API | Render |
| Celery Worker | Render |
| PostgreSQL | Render |
| Redis Broker | Upstash Redis |
| Frontend | Vercel |


## 🌍 Live Links

| Component | URL |
|----------|------|
| Frontend | 🔗 [https://your-frontend-url.vercel.app](https://produuct-importer.vercel.app/) |
| Backend API | 🔗 [https://your-backend-api-url.onrender.com](https://product-importer-1do8.onrender.com) |

## 📦 Deployment Notes
### Backend Deployment (Render)
- Created:

  - Web Service for Django API

  - PostgreSQL instance

  - Celery Worker Service
    
- Configured environment variables:
- Gunicorn command used:
  ```sh
  gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT
  ```
### Redis (Upstash)

- Created Redis instance

- Copied REST URL and used as REDIS_URL in backend & worker

### Frontend Deployment (Vercel)

- Connected GitHub repo
- Set environment variable:
  ```
  VITE_API_URL=https://product-importer-1do8.onrender.com
  ```
- Triggered build and deployment

## 🧑‍💻 Author

Anagha P H
anaghamenon7373@gmail.com
