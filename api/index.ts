import serverApp from "../server.js";

const app = (serverApp as any)?.default || serverApp;

export default app;

