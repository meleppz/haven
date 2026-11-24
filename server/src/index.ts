import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
// Bind to 0.0.0.0 so a phone on the LAN (Expo Go) can reach the server.
createApp().listen(port, "0.0.0.0", () => {
  console.log(`Haven server listening on http://0.0.0.0:${port}`);
});
