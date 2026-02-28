import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			// 所有 /api 开头的请求代理到后端
			"/api": {
				target: "http://localhost:7777",
				changeOrigin: true,
			},
		},
	},
});
