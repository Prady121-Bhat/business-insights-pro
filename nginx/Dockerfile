FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/nginx.conf

RUN nginx -t

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
