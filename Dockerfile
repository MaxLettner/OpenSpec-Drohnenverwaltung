# Drone Lending System in one image: the API serves the Angular build (openspec run-in-docker, design D3).

FROM node:24-alpine AS frontend
WORKDIR /src
RUN npm install -g npm@11.19.1
COPY frontend/drone-inventory-ui/package.json frontend/drone-inventory-ui/package-lock.json ./
RUN npm ci
COPY frontend/drone-inventory-ui/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/DroneInventory.Api/DroneInventory.Api.csproj DroneInventory.Api/
RUN dotnet restore DroneInventory.Api/DroneInventory.Api.csproj
COPY backend/DroneInventory.Api/ DroneInventory.Api/
RUN dotnet publish DroneInventory.Api/DroneInventory.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
# Owned by the non-root app user, so a new named volume on /data is writable for SQLite.
RUN mkdir /data && chown "$APP_UID" /data
COPY --from=backend /out ./
COPY --from=frontend /src/dist/drone-inventory-ui/browser ./wwwroot
ENV ConnectionStrings__Default="Data Source=/data/droneinventory.db"
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "DroneInventory.Api.dll"]
